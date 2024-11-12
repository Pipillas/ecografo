const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Usuario } = require('./database');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid'); // Necesitas instalar uuid para generar UUIDs únicos

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: '*'
});

app.use(cors());
app.use(express.json());

// Define la ruta de la carpeta que deseas observar
const rutaCarpeta = path.join(__dirname, 'estudios');

// Inicializa el observador en la carpeta "estudios"
const watcher = chokidar.watch(rutaCarpeta, {
    ignored: /(^|[\/\\])\../, // ignora archivos ocultos
    persistent: true,
    ignoreInitial: true,
    depth: 0
});

// Función para separar letras y números
const separarLetrasNumeros = (str) => {
    const resultado = str.match(/([a-zA-Z_]+)(\d+)/);
    return resultado ? { letras: resultado[1], numeros: resultado[2] } : null;
};

// Función para analizar una sola carpeta específica de usuario
async function analizarCarpeta(usuarioPath) {
    const usuarioNombre = path.basename(usuarioPath);
    const { letras, numeros } = separarLetrasNumeros(usuarioNombre);
    if (!letras || !numeros) return; // Salir si no se puede extraer letras y números

    const estudiosArray = [];
    const estudios = fs.readdirSync(usuarioPath);

    for (const estudio of estudios) {
        const fotos_estudios = fs.readdirSync(path.join(usuarioPath, estudio));

        // Si el estudio ya existe en la base de datos, recuperar su `id`
        let estudioId;
        const estudioExistente = await Usuario.findOne(
            { dni: numeros, "estudios.nombre": estudio },
            { "estudios.$": 1 }
        );

        if (estudioExistente) {
            // Si el estudio ya tiene un `id`, usar el existente
            estudioId = estudioExistente.estudios[0].id;
        } else {
            // Si no tiene un `id`, generar uno nuevo
            estudioId = uuidv4();
        }

        estudiosArray.push({
            nombre: estudio, fotos: fotos_estudios, id: estudioId,
        });
    }

    // Crear el objeto base del usuario
    let usuarioObjeto = {
        dni: numeros,
        nombre: letras,
        clave: numeros,
        estudios: estudiosArray,
    };

    try {
        // Verificar si el usuario ya existe en la base de datos
        const usuarioExistente = await Usuario.findOne({ dni: numeros });

        // Si el usuario existe y su clave es distinta del dni, no actualizar la clave
        if (usuarioExistente && usuarioExistente.clave !== numeros) {
            delete usuarioObjeto.clave;
        }

        // Actualizar si existe o crear un nuevo documento si no existe
        await Usuario.findOneAndUpdate(
            { dni: numeros },
            usuarioObjeto,
            { upsert: true, new: true }
        );

        console.log(`Usuario ${numeros} creado o actualizado con éxito.`);
    } catch (error) {
        console.error('Error al crear o actualizar usuario:', error);
    }
}


// Función para mover los archivos de una carpeta a otra
function moverArchivos(oldPath, newPath) {
    const archivos = fs.readdirSync(oldPath);
    archivos.forEach((archivo) => {
        const oldFilePath = path.join(oldPath, archivo);
        const newFilePath = path.join(newPath, archivo);

        // Mueve el archivo o directorio
        fs.renameSync(oldFilePath, newFilePath);
    });
}

// Función para analizar todas las carpetas de estudios inicialmente
async function analizarTodasLasCarpetas() {
    const estudiosPath = path.join(__dirname, 'estudios');
    const usuarios = fs.readdirSync(estudiosPath);

    // Procesar cada carpeta de usuario en el directorio 'estudios'
    for (const usuario of usuarios) {
        const usuarioPath = path.join(estudiosPath, usuario);
        await analizarCarpeta(usuarioPath);
    }
}

// Ejecutar el análisis inicial de todas las carpetas
analizarTodasLasCarpetas().then(() => {
    console.log("Análisis inicial de todas las carpetas completado.");
});

// Escuchar eventos en la carpeta específica
watcher.on('all', async (event, pathParameter) => {
    const { numeros } = separarLetrasNumeros(path.basename(pathParameter));

    if (event === 'unlinkDir') {
        console.log(`Carpeta eliminada: ${pathParameter}`);
        if (numeros) {
            try {
                // Solo elimina el usuario si no hay una carpeta existente que se haya movido
                const carpetasConMismoDNI = fs.readdirSync(path.join(__dirname, 'estudios')).filter(usuario => {
                    return usuario.includes(numeros);
                });

                // Si no hay carpetas con el mismo DNI, eliminamos al usuario
                if (carpetasConMismoDNI.length === 0) {
                    await Usuario.findOneAndDelete({ dni: numeros });
                    console.log(`Usuario con dni ${numeros} eliminado de la base de datos.`);
                } else {
                    console.log(`No se elimina el usuario ${numeros} porque todavía existen carpetas asociadas.`);
                }
            } catch (error) {
                console.error('Error al eliminar usuario:', error);
            }
        }
    } else {
        console.log(`Carpeta añadida: ${pathParameter}`);

        if (numeros) {
            // Verifica si ya existe una carpeta con el mismo DNI, excluyendo la carpeta recién añadida
            const carpetasConMismoDNI = fs.readdirSync(path.join(__dirname, 'estudios')).filter(usuario => {
                const usuarioPath = path.join(__dirname, 'estudios', usuario);
                return usuario.includes(numeros) && usuarioPath !== pathParameter; // Asegúrate de excluir la carpeta recién creada
            });

            // Si hay una carpeta existente con el mismo DNI
            if (carpetasConMismoDNI.length > 0) {
                const carpetaExistentePath = path.join(__dirname, 'estudios', carpetasConMismoDNI[0]);

                // Mover todos los archivos de la carpeta existente a la nueva
                moverArchivos(carpetaExistentePath, pathParameter);

                // Eliminar la carpeta vieja después de mover los archivos
                fs.rmSync(carpetaExistentePath, { recursive: true });

                console.log(`Contenido de la carpeta ${carpetasConMismoDNI[0]} movido a ${pathParameter} y la carpeta antigua fue eliminada.`);
            }

            await analizarCarpeta(pathParameter); // Analiza solo la carpeta añadida
        }
    }
});

// Configuración del servidor y socket.io
const JWT_SECRET = 'pipillitas'; // Debes cambiar esto por una variable de entorno

io.on('connection', (socket) => {
    socket.on('entrar', async (usuario, callback) => {
        try {
            const usuarioEncontrado = await Usuario.findOne({ dni: usuario.dni });
            if (!usuarioEncontrado) {
                return callback({ success: false, message: 'No existe ese usuario' });
            }
            if (usuario.clave !== usuarioEncontrado.clave) {
                return callback({ success: false, message: 'Contraseña incorrecta' });
            }
            const token = jwt.sign({ dni: usuarioEncontrado.dni, id: usuarioEncontrado._id, nombre: usuarioEncontrado.nombre }, JWT_SECRET);
            callback({ success: true, token });
        } catch (error) {
            console.error('Error en el servidor:', error);
            callback({ success: false, message: 'Error interno del servidor' });
        }
    });
    // Escuchar evento de validación del token
    socket.on('validate-token', (token, callback) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            callback({ valid: true, message: 'Token válido', decoded });
        } catch (error) {
            callback({ valid: false, message: 'Token invalido' });
        }
    });

    socket.on('estudios', async (id, callback) => {
        try {
            const usuario = await Usuario.findById(id);
            callback({ usuario, success: true });
        } catch (error) {
            callback({ usuario: null, success: false });
        }
    });

    socket.on('estudio', async (id, callback) => {
        try {
            const usuario = await Usuario.findOne(
                { "estudios": { $elemMatch: { id } } } // Usa `$elemMatch` para asegurarte de que exista el `id` dentro de `estudios`
            );
            // Extraer las fotos del estudio encontrado usando find
            const estudio = usuario.estudios.find(est => est.id === id);
            callback({ estudio, success: true });
        } catch (error) {
            callback({ error: 'Error al buscar el estudio', success: false });
        }
    });

    socket.on('cambiar-password', async (data, callback) => {
        try {
            await Usuario.findByIdAndUpdate(data.id, { clave: data.passwordNueva });
            callback({ success: true });
        } catch (error) {
            callback({ success: false, error: 'Sucedio un error' });
        }
    });
});

// Inicio del servidor
const PORT = process.env.PORT || 3000;

// Usa express.static para servir los archivos de esa carpeta
app.use('/estudios', express.static(rutaCarpeta));

app.get('/descargar/:id', async (req, res) => {
    try {
        const usuario = await Usuario.findOne(
            { "estudios": { $elemMatch: { id: req.params.id } } } // Usa `$elemMatch` para asegurarte de que exista el `id` dentro de `estudios`
        );
        // Extraer las fotos del estudio encontrado usando find
        const estudio = usuario.estudios.find(est => est.id === req.params.id);
        const downloadPath = path.join(__dirname, 'estudios', `${usuario.nombre}${usuario.dni}`, estudio.nombre, estudio.id);
        console.log(downloadPath);
    } catch (error) {
        console.log(error);
    }
    res.json({ success: true });
});

// Sirve los archivos estáticos desde la carpeta 'dist_web' en la raíz '/'
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Maneja todas las rutas para el frontend "web" en la raíz '/'
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});