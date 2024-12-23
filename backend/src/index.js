const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Usuario, dbConnection } = require('./database');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: '*'
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// Define la ruta de la carpeta que deseas observar
// const rutaCarpeta = 'C:/Users/pipas/OneDrive/estudios';
const rutaCarpeta = 'C:/Users/Pipas/Desktop/prueba';

const watcher = chokidar.watch(rutaCarpeta, {
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    awaitWriteFinish: {
        stabilityThreshold: 2000, // Tiempo de espera más largo si los archivos se escriben muy rápido
        pollInterval: 500,
    },
    interval: 500, // Intervalo entre las verificaciones
});


// Configuración de multer para manejar archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Guardar los archivos en una carpeta llamada 'uploads'
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Asignar un nombre único al archivo usando el DNI del paciente
        const filename = `${req.body.dni}_${Date.now()}.pdf`; // Nombre del archivo como DNI + timestamp
        cb(null, filename);
    }
});

// Solo aceptar archivos PDF
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Solo se permiten archivos PDF'), false);
        }
        cb(null, true);
    }
});

// Función para separar letras y números
const separarLetrasNumeros = (str) => {
    const resultado = str.match(/([a-zA-Z_]+)(\d+)/);
    return resultado ? { letras: resultado[1], numeros: resultado[2] } : { letras: null, numeros: null };
};

function copiarArchivos(origen, destino) {
    try {
        // Verificar si la carpeta origen existe
        if (!fs.existsSync(origen)) {
            console.error(`La carpeta origen "${origen}" no existe.`);
            return;
        }

        // Crear la carpeta destino si no existe
        if (!fs.existsSync(destino)) {
            fs.mkdirSync(destino, { recursive: true });
        }

        // Leer los elementos en la carpeta origen
        const elementos = fs.readdirSync(origen);

        for (const elemento of elementos) {
            const rutaOrigen = path.join(origen, elemento);
            const rutaDestino = path.join(destino, elemento);

            const stats = fs.statSync(rutaOrigen);

            if (stats.isDirectory()) {
                // Si es una carpeta, llamamos recursivamente
                copiarArchivos(rutaOrigen, rutaDestino);
            } else if (stats.isFile()) {
                // Si es un archivo, lo copiamos
                fs.copyFileSync(rutaOrigen, rutaDestino);
                console.log(`Archivo copiado: ${rutaDestino}`);
            }
        }

        // Una vez copiado todo, eliminar la carpeta origen
        fs.rmSync(origen, { recursive: true, force: true });
        console.log(`Carpeta eliminada: ${origen}`);
    } catch (err) {
        console.error('Error al copiar o eliminar archivos:', err);
    }
}

// Función para analizar una sola carpeta específica de usuario
async function analizarCarpeta(usuarioPath) {
    const usuarioNombre = path.basename(usuarioPath);
    const { letras, numeros } = separarLetrasNumeros(usuarioNombre);
    if (!letras || !numeros) return; // Salir si no se puede extraer letras y números
    const usuarios = fs.readdirSync(rutaCarpeta);
    for (let i = 0; i < usuarios.length; i++) {
        const data = separarLetrasNumeros(usuarios[i]);
        if (!data.numeros) return; // Salir si no se puede extraer letras y números
        if (numeros === data.numeros && usuarios[i] !== usuarioNombre) {
            console.log('0'.repeat(20));
            console.log(usuarios[i], usuarioNombre);
            copiarArchivos(path.join(rutaCarpeta, usuarios[i]), usuarioPath);
        };
    };
    const estudiosArray = [];
    const estudios = fs.readdirSync(usuarioPath);
    for (const estudio of estudios) {
        const fotos_estudios = fs.readdirSync(path.join(usuarioPath, estudio));
        // Si el estudio ya existe en la base de datos, recuperar su `id`
        let estudioId;
        let informado;
        const estudioExistente = await Usuario.findOne(
            { dni: numeros, "estudios.nombre": estudio },
            { "estudios.$": 1 }
        );

        if (estudioExistente) {
            // Si el estudio ya tiene un `id`, usar el existente
            estudioId = estudioExistente.estudios[0].id;
            informado = estudioExistente.estudios[0].informado;
        } else {
            // Si no tiene un `id`, generar uno nuevo
            estudioId = uuidv4();
            informado = false;
        }
        estudiosArray.push({
            nombre: estudio, fotos: fotos_estudios, id: estudioId, informado
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
        //console.log(`Usuario ${numeros} creado o actualizado con éxito.`);
    } catch (error) {
        console.error('Error al crear o actualizar usuario:', error);
    }
};

// Función para analizar todas las carpetas de estudios inicialmente
async function analizarTodasLasCarpetas() {
    const usuarios = fs.readdirSync(rutaCarpeta);
    // Procesar cada carpeta de usuario en el directorio 'estudios'
    for (const usuario of usuarios) {
        const usuarioPath = path.join(rutaCarpeta, usuario);
        console.log(usuarioPath);
        await analizarCarpeta(usuarioPath);
    }
}

// Función para obtener la ruta completa de la carpeta de primer nivel después de "estudios"
const getFirstLevelFolderPath = (pathToFolder) => {
    // Obtén la ruta relativa a "estudios"
    const relativePath = path.relative(rutaCarpeta, pathToFolder);
    // Divídela en segmentos
    const segments = relativePath.split(path.sep).filter(Boolean);
    // Si hay al menos un segmento, reconstruye la ruta completa del primer nivel
    if (segments.length > 0) {
        return path.join(rutaCarpeta, segments[0]);
    }
    return null;
};

async function borrarUsuario(usuarioPath) {
    const usuarioNombre = path.basename(usuarioPath);
    const { letras, numeros } = separarLetrasNumeros(usuarioNombre);
    if (!letras || !numeros) return; // Salir si no se puede extraer letras y números
    try {
        // Intentar borrar el usuario en base al `dni`
        const resultado = await Usuario.deleteOne({ dni: numeros });
        if (resultado.deletedCount > 0) {
            console.log(`Usuario con DNI ${numeros} borrado con éxito.`);
        }
    } catch (error) {
        console.error('Error al borrar usuario:', error);
    }
};

watcher.on('all', async (event, pathParameter) => {
    const firstLevelFolderPath = getFirstLevelFolderPath(pathParameter);
    if (!firstLevelFolderPath) return; // Ignorar si no hay una carpeta válida
    try {
        if (event === 'add' || event === 'addDir') {
            await analizarCarpeta(firstLevelFolderPath);
        } else if (event === 'unlink' || event === 'unlinkDir') {
            await borrarUsuario(firstLevelFolderPath);
        }
    } catch (error) {
        console.error(`Error al manejar evento ${event} para ${pathParameter}:`, error);
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
    socket.on('validate-token', (token, callback) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.dni === 'admin') {
                callback({ valid: true, admin: true, message: 'Token valido', decoded });
            } else {
                callback({ valid: true, message: 'Token valido', decoded });
            }
        } catch (error) {
            console.log(error)
            callback({ valid: false, message: 'Token invalido' });
        }
    });
    socket.on('estudios', async (id, callback) => {
        try {
            const usuario = await Usuario.findById(id);
            callback({ usuario, success: true });
        } catch (error) {
            console.log(error)
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
            console.log(error);
            callback({ error: 'Error al buscar el estudio', success: false });
        }
    });
    socket.on('cambiar-password', async (data, callback) => {
        try {
            await Usuario.findByIdAndUpdate(data.id, { clave: data.passwordNueva });
            callback({ success: true });
        } catch (error) {
            console.log(error);
            callback({ success: false, error: 'Sucedio un error' });
        }
    });
    socket.on('pacientes', async (callback) => {
        try {
            const pacientes = await Usuario.find({ dni: { $ne: 'admin' } });
            callback({ success: true, pacientes });
        } catch (error) {
            console.log(error);
            callback({ success: false, error: 'Sucedio un error' });
        }
    });
    socket.on('informes', async (callback) => {
        try {
            // Realizamos una agregación para obtener los usuarios con sus estudios clasificados
            const usuarios = await Usuario.aggregate([
                {
                    // Desglosamos los estudios en dos categorías: informados y no informados
                    $project: {
                        dni: 1,
                        clave: 1,
                        createdAt: 1,
                        estudiosInformados: {
                            $filter: {
                                input: "$estudios",
                                as: "estudio",
                                cond: { $eq: ["$$estudio.informado", true] } // Filtra los estudios informados
                            }
                        },
                        estudiosNoInformados: {
                            $filter: {
                                input: "$estudios",
                                as: "estudio",
                                cond: { $eq: ["$$estudio.informado", false] } // Filtra los estudios no informados
                            }
                        }
                    }
                },
                {
                    // Solo devolver usuarios que tengan estudios informados o no informados
                    $match: {
                        $or: [
                            { "estudiosInformados.0": { $exists: true } }, // Tiene estudios informados
                            { "estudiosNoInformados.0": { $exists: true } } // O tiene estudios no informados
                        ]
                    }
                }
            ]);

            // Filtramos los usuarios con estudios informados y no informados
            const usuariosInformados = usuarios.filter(usuario => usuario.estudiosInformados.length > 0);
            const usuariosNoInformados = usuarios.filter(usuario => usuario.estudiosNoInformados.length > 0);

            // Devolvemos los usuarios clasificados
            callback({
                usuariosInformados,
                usuariosNoInformados
            });

        } catch (error) {
            console.error('Error al obtener los informes:', error);
            callback({ error: 'Hubo un problema al obtener los informes.' });
        }
    });

});

// Inicio del servidor
const PORT = process.env.PORT || 3000;

// Endpoint para recibir el archivo
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        res.status(200).send({ message: 'Archivo subido correctamente', file: req.file });
    } catch (error) {
        res.status(500).send({ error: 'Error al subir el archivo' });
    }
});

// Usa express.static para servir los archivos de esa carpeta
app.use('/estudios', express.static(rutaCarpeta));

// Sirve los archivos estáticos desde la carpeta 'dist_web' en la raíz '/'
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Maneja todas las rutas para el frontend "web" en la raíz '/'
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

async function crearAdmin() {
    await Usuario.create({
        dni: 'admin',
        clave: 'admin',
        nombre: 'admin',
    });
};

server.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);
    try {
        // Espera a que la base de datos esté conectada
        await dbConnection;
        console.log("Base de datos conectada. Analizando carpetas...");
        // Una vez conectado, analiza las carpetas
        await analizarTodasLasCarpetas();
        //await crearAdmin();
        console.log("Carpetas analizadas.");
    } catch (error) {
        console.error("Error al conectar con la base de datos o analizar carpetas:", error);
    }
});