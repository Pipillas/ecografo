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
const bcrypt = require('bcrypt'); // <--- Asegúrate de que lo tengas instalado

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: '*'
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// Define la ruta de la carpeta que deseas observar
const rutaCarpeta = 'C:/Users/pipas/OneDrive/estudios';
//const rutaCarpeta = 'C:/Users/Pipas/Desktop/prueba';
//const IP = 'http://192.168.0.26:3000';
const IP = 'https://ecoalem489.com';

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


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const normalizedPath = path.normalize(rutaCarpeta);
        const uploadPath = path.join(normalizedPath, req.params.usuario, req.params.estudioNombre);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const filename = `${Date.now()}.pdf`;
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
            copiarArchivos(path.join(rutaCarpeta, usuarios[i]), usuarioPath);
        };
    };
    const estudiosArray = [];
    const estudios = fs.readdirSync(usuarioPath);
    for (const estudio of estudios) {
        const fotos_estudios = fs.readdirSync(path.join(usuarioPath, estudio));
        // Si el estudio ya existe en la base de datos, recuperar su `id`
        let estudioId = uuidv4();
        let informado = false;
        let pathInforme;
        const estudioExistente = await Usuario.findOne(
            { dni: numeros, "estudios.nombre": estudio },
            { "estudios.$": 1 }
        );
        if (estudioExistente) {
            // Si el estudio ya tiene un `id`, usar el existente
            estudioId = estudioExistente.estudios[0].id;
            informado = estudioExistente.estudios[0].informado;
            pathInforme = estudioExistente.estudios[0].path;
        };
        estudiosArray.push({
            nombre: estudio, fotos: fotos_estudios, id: estudioId, informado, path: pathInforme,
        });
    }
    // Crear el objeto base del usuario

    const hashedPassword = bcrypt.hashSync(numeros, 10);

    let usuarioObjeto = {
        dni: numeros,
        nombre: letras,
        clave: hashedPassword,
        estudios: estudiosArray,
    };
    try {
        // Verificar si el usuario ya existe en la base de datos
        const usuarioExistente = await Usuario.findOne({ dni: numeros });
        // Si el usuario existe y su clave es distinta del dni, no actualizar la clave
        if (usuarioExistente && usuarioExistente.clave !== hashedPassword) {
            delete usuarioObjeto.clave;
        }
        // Actualizar si existe o crear un nuevo documento si no existe
        await Usuario.findOneAndUpdate(
            { dni: numeros },
            usuarioObjeto,
            { upsert: true, new: true }
        );
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

watcher.on('all', async (event, pathParameter) => {
    const firstLevelFolderPath = getFirstLevelFolderPath(pathParameter);
    if (!firstLevelFolderPath) return; // Ignorar si no hay una carpeta válida
    try {
        if (event === 'add' || event === 'addDir' || event === 'unlink' || event === 'unlinkDir') {
            await analizarCarpeta(firstLevelFolderPath);
            io.emit('cambios');
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
            // Comparar la clave dada con la clave hasheada en la BD
            const match = bcrypt.compareSync(usuario.clave, usuarioEncontrado.clave);
            if (!match) {
                return callback({ success: false, message: 'Contraseña incorrecta, para recuperarla contactese al 291-XXX-XXXX' });
            }
            const token = jwt.sign(
                { dni: usuarioEncontrado.dni, id: usuarioEncontrado._id, nombre: usuarioEncontrado.nombre },
                JWT_SECRET
            );
            if (usuarioEncontrado.dni === 'admin') {
                callback({ success: true, token, admin: true });
            } else {
                callback({ success: true, token, admin: false });
            }
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
            if (!usuario) {
                return callback({ error: 'Usuario o estudio no encontrado', success: false });
            }
            // Extraer el estudio correspondiente
            const estudio = usuario.estudios.find(est => est.id === id);
            if (!estudio) {
                return callback({ error: 'Estudio no encontrado', success: false });
            }
            // Construir URLs completas para las imágenes del estudio
            const urls = estudio.fotos.map(foto => `${IP}/estudios/${usuario.nombre}${usuario.dni}/${estudio.nombre}/${foto}`);
            // Responder con las URLs generadas
            callback({
                estudio: {
                    ...estudio,
                    fotos: urls, // Sustituir las rutas relativas por URLs completas
                },
                success: true,
            });
        } catch (error) {
            console.error(error);
            callback({ error: 'Error al buscar el estudio', success: false });
        }
    });
    socket.on('cambiar-password', async (data, callback) => {
        try {
            const hashedPassword = bcrypt.hashSync(data.passwordNueva, 10);
            await Usuario.findByIdAndUpdate(data.id, { clave: hashedPassword });
            callback({ success: true });
        } catch (error) {
            console.log(error);
            callback({ success: false, error: 'Sucedio un error' });
        }
    });
    socket.on('pacientes', async (text, callback) => {
        try {
            const regex = new RegExp(text.replaceAll(' ', '_'), 'i'); // Crear regex que ignore mayúsculas/minúsculas
            const pacientes = await Usuario.find({
                dni: { $ne: 'admin' }, // Excluir administrador
                $or: [
                    { dni: { $regex: regex } }, // Buscar coincidencia en el DNI
                    { nombre: { $regex: regex } } // Buscar coincidencia en el Nombre
                ]
            });
            callback({ success: true, pacientes });
        } catch (error) {
            console.log(error);
            callback({ success: false, error: 'Sucedio un error' });
        }
    });
    socket.on('informes', async (callback) => {
        const usuariosInformados = await Usuario.find({ "estudios.informado": true });
        const estudiosInformados = usuariosInformados.map(usuario => ({
            ...usuario.toObject(), // Convierte el documento de Mongoose a un objeto plano
            estudios: usuario.estudios.filter(estudio => estudio.informado === true),
        }));

        const usuariosNoInformados = await Usuario.find({ "estudios.informado": false });
        const estudiosNoInformados = usuariosNoInformados.map(usuario => ({
            ...usuario.toObject(), // Convierte el documento de Mongoose a un objeto plano
            estudios: usuario.estudios.filter(estudio => estudio.informado === false),
        }));

        callback({ estudiosInformados, estudiosNoInformados });
    });
    socket.on('cambiar-informe', async (id) => {
        const updatedUser = await Usuario.findOneAndUpdate(
            { "estudios.id": id },
            { $set: { "estudios.$.informado": false } },
            { new: true }
        );
        if (updatedUser) {
            updatedUser.estudios.forEach((estudio) => {
                if (estudio.id === id) {
                    estudio.fotos.forEach((foto) => {
                        if (foto.endsWith('.pdf')) {
                            const filePath = path.join(
                                rutaCarpeta,
                                `${updatedUser.nombre}${updatedUser.dni}`,
                                estudio.nombre,
                                foto
                            );
                            try {
                                fs.unlinkSync(filePath);
                                console.log('Archivo eliminado:', filePath);
                            } catch (err) {
                                console.error('Error al eliminar archivo:', err);
                            }
                        }
                    });
                }
            });
        }
        io.emit('cambios');
    });
});

// Inicio del servidor
const PORT = process.env.PORT || 3000;

// Endpoint para recibir el archivo
app.post('/upload/:usuario/:estudioNombre', upload.single('file'), async (req, res) => {
    try {
        await Usuario.findOneAndUpdate(
            { "estudios.id": req.body.id },
            { $set: { "estudios.$.informado": true, "estudios.$.path": req.file.path } }, // Actualiza solo el elemento del array que coincide
        );
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
    const hashedPassword = bcrypt.hashSync('admin', 10);
    await Usuario.create({
        dni: 'admin',
        clave: hashedPassword,
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