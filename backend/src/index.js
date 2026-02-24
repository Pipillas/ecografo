//const chokidar = require('chokidar');
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
// const rutaCarpeta = 'C:/Users/Server/OneDrive/estudios';
const rutaCarpeta = 'C:/Users/Administrator/OneDrive/estudios'
//const rutaCarpeta = '/mnt/onedrive'; // ESTO ES PARA HOSTINGER VPS JULI
//const rutaCarpeta = 'C:/Users/Pipas/Desktop/prueba';
//const IP = 'http://192.168.0.26:3000';
const IP = 'https://ecoalem489.com';

function analizarCarpetasModificadasEn(minutos = 5) {
    const ahora = Date.now();
    const usuarios = fs.readdirSync(rutaCarpeta);

    for (const usuario of usuarios) {
        const usuarioPath = path.join(rutaCarpeta, usuario);

        try {
            const stats = fs.statSync(usuarioPath);
            const ultimaModificacion = stats.mtimeMs;
            // Si se modificó en los últimos X minutos
            if (ahora - ultimaModificacion < minutos * 60 * 1000) {
                console.log(`Analizando carpeta modificada: ${usuarioPath}`);
                analizarCarpeta(usuarioPath); // No hace falta que sea async acá
            }
        } catch (error) {
            console.error(`Error con la carpeta ${usuarioPath}:`, error);
        }
    }

    io.emit('cambios');
}

setInterval(() => {
    analizarCarpetasModificadasEn(10); // analiza solo las modificadas en el último minutos
}, 60 * 1000);

/*
const watcher = chokidar.watch(rutaCarpeta, {
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    awaitWriteFinish: {
        stabilityThreshold: 2000, // Tiempo de espera más largo si los archivos se escriben muy rápido
        pollInterval: 500,
    },
    interval: 30000, // Intervalo entre las verificaciones
});
*/

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const normalizedPath = path.normalize(rutaCarpeta);
        const uploadPath = path.join(normalizedPath, req.params.usuario, req.params.estudioNombre);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const filename = `informe.pdf`;
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
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
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
    if (!letras || !numeros) {
        console.log(`Faltan letras o numeros: ${usuarioPath}`);
        return; // Salir si no se puede extraer letras y números
    }
    const usuarios = fs.readdirSync(rutaCarpeta);
    for (let i = 0; i < usuarios.length; i++) {
        const data = separarLetrasNumeros(usuarios[i]);
        if (!data.numeros) {
            console.log(`Usuario inválido encontrado: ${usuarios[i]}. Continuando.`);
            continue; // Salir de esta iteración, pero no detener el bucle
        };
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
    //console.error(`Carpeta analizada correctamente ${usuarioPath}`);
};

// Función para analizar todas las carpetas de estudios inicialmente
function analizarTodasLasCarpetas() {
    const usuarios = fs.readdirSync(rutaCarpeta);
    // Procesar cada carpeta de usuario en el directorio 'estudios'
    for (const usuario of usuarios) {
        console.log(usuario);
        const usuarioPath = path.join(rutaCarpeta, usuario);
        analizarCarpeta(usuarioPath);
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

/*
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
*/

// Configuración del servidor y socket.io
const JWT_SECRET = 'pipillitas'; // Debes cambiar esto por una variable de entorno

function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function moveMergeDir(src, dest) {
    if (!fs.existsSync(src)) return;
    ensureDirSync(dest);

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            moveMergeDir(srcPath, destPath);
        } else {
            // Si el archivo ya existe en destino, conserva ambos renombrando el que viene de src
            if (fs.existsSync(destPath)) {
                const parsed = path.parse(destPath);
                // sufijo con timestamp para evitar colisión
                const altDestPath = path.join(parsed.dir, `${parsed.name}__from_merge_${Date.now()}${parsed.ext}`);
                fs.renameSync(srcPath, altDestPath);
            } else {
                // mover (rename) si mismo volumen; si falla, copiar y borrar
                try {
                    fs.renameSync(srcPath, destPath);
                } catch {
                    fs.copyFileSync(srcPath, destPath);
                    fs.unlinkSync(srcPath);
                }
            }
        }
    }
    // intentar borrar la carpeta fuente si quedó vacía
    try { fs.rmdirSync(src); } catch { }
}

function uniqueArray(arr) {
    return Array.from(new Set(arr));
}

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
    socket.on('pacientes', async ({ text = '', page = 1, limit = 10 }, callback) => {
        try {
            const regex = new RegExp(text.replaceAll(' ', '_'), 'i'); // Crear regex que ignore mayúsculas/minúsculas
            const skip = (page - 1) * limit;

            // Filtrar pacientes según el término de búsqueda
            const query = {
                dni: { $ne: 'admin' }, // Excluir administrador
                $or: [
                    { dni: { $regex: regex } }, // Buscar coincidencia en el DNI
                    { nombre: { $regex: regex } } // Buscar coincidencia en el Nombre
                ],
            };

            // Obtener pacientes paginados
            const totalPatients = await Usuario.countDocuments(query);
            const pacientes = await Usuario.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            callback({
                success: true,
                pacientes,
                totalPatients,
            });
        } catch (error) {
            console.log(error);
            callback({ success: false, error: 'Error al obtener pacientes' });
        }
    });

    socket.on('informes', async ({ text = '', page = 1, limit = 20 }, callback) => {
        try {
            const regex = new RegExp(text.replaceAll(' ', '_'), 'i'); // Ignorar mayúsculas/minúsculas y reemplazar espacios
            const skip = (page - 1) * limit;

            const baseMatchInformados = {
                dni: { $ne: 'admin' }, // Excluir administrador
                $or: [
                    { dni: { $regex: regex } }, // Buscar coincidencia en el DNI
                    { nombre: { $regex: regex } } // Buscar coincidencia en el Nombre
                ],
            };

            const estudiosInformadosPipeline = [
                { $match: baseMatchInformados },
                { $unwind: '$estudios' },
                { $match: { 'estudios.informado': true } },
                {
                    // Mantiene la misma lógica de fecha usada en frontend (asume prefijo de 3 letras + YYYYMMDDHHmm...)
                    $addFields: { estudioFechaOrden: { $substrCP: ['$estudios.nombre', 3, 12] } }
                },
                { $sort: { estudioFechaOrden: -1, 'estudios.nombre': -1, _id: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        dni: 1,
                        nombre: 1,
                        estudio: '$estudios',
                    }
                },
            ];

            const totalInformadosPipeline = [
                { $match: baseMatchInformados },
                { $unwind: '$estudios' },
                { $match: { 'estudios.informado': true } },
                { $count: 'total' },
            ];

            const [filasInformadas, totalInformadosResult] = await Promise.all([
                Usuario.aggregate(estudiosInformadosPipeline),
                Usuario.aggregate(totalInformadosPipeline),
            ]);

            // Se conserva el shape esperado por el frontend: cada item con `dni`, `nombre` y array `estudios`.
            const estudiosInformados = filasInformadas.map((fila) => ({
                _id: fila._id,
                dni: fila.dni,
                nombre: fila.nombre,
                estudios: [fila.estudio],
            }));

            const totalInformados = totalInformadosResult[0]?.total || 0;

            // 🔹 Obtener estudios NO informados SIN aplicar el filtro de búsqueda
            const totalNoInformados = await Usuario.countDocuments({ "estudios.informado": false });
            const usuariosNoInformados = await Usuario.find({ "estudios.informado": false })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const estudiosNoInformados = usuariosNoInformados.map(usuario => ({
                ...usuario.toObject(),
                estudios: usuario.estudios.filter(estudio => estudio.informado === false),
            }));

            callback({
                estudiosInformados,
                totalInformados,
                estudiosNoInformados,  // 🔹 Los estudios NO informados ya NO tienen filtro
                totalNoInformados,
                success: true,
            });
        } catch (error) {
            console.error('Error en el backend de informes:', error);
            callback({ success: false, error: 'Error al obtener informes' });
        }
    });

    socket.on('eliminar-estudio', async (id) => {
        try {
            // Buscar el usuario y el estudio correspondiente
            const usuario = await Usuario.findOne({ "estudios.id": id });

            if (!usuario) {
                console.error(`Usuario no encontrado para el estudio con ID: ${id}`);
                return;
            }

            const estudio = usuario.estudios.find(est => est.id === id);
            if (!estudio) {
                console.error(`Estudio no encontrado con ID: ${id}`);
                return;
            }

            // Construir la ruta completa de la carpeta a eliminar
            const estudioPath = path.join(
                rutaCarpeta,
                `${usuario.nombre}${usuario.dni}`,
                estudio.nombre
            );

            // Eliminar la carpeta del sistema de archivos
            if (fs.existsSync(estudioPath)) {
                fs.rmSync(estudioPath, { recursive: true, force: true });
                console.log(`Carpeta eliminada: ${estudioPath}`);
            } else {
                console.log(`La carpeta no existe: ${estudioPath}`);
            }

            // Eliminar el estudio de la base de datos
            await Usuario.findOneAndUpdate(
                { dni: usuario.dni },
                { $pull: { estudios: { id } } } // Eliminar el estudio del array
            );

            // Notificar a los clientes para que actualicen la lista
            io.emit('cambios');
        } catch (error) {
            console.error(`Error al eliminar el estudio con ID ${id}:`, error);
        }
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

    socket.on('cambiar-dni', async ({ id, nuevoDNI }, callback) => {
        try {
            const usuarioOrigen = await Usuario.findById(id);
            if (!usuarioOrigen) return callback({ success: false, error: 'Usuario no encontrado' });

            const dniDestinoDoc = await Usuario.findOne({ dni: nuevoDNI });

            const carpetaOrigen = path.join(rutaCarpeta, `${usuarioOrigen.nombre}${usuarioOrigen.dni}`);
            const nombreDestino = dniDestinoDoc ? dniDestinoDoc.nombre : usuarioOrigen.nombre;
            const carpetaDestino = path.join(rutaCarpeta, `${nombreDestino}${nuevoDNI}`);

            const baseVieja = `${usuarioOrigen.nombre}${usuarioOrigen.dni}`;
            const baseNueva = `${nombreDestino}${nuevoDNI}`;

            // Caso A: el DNI NO existe → rename + update + REESCRIBIR PATHS
            if (!dniDestinoDoc) {
                const nuevaClave = bcrypt.hashSync(nuevoDNI, 10);

                // Renombrar carpeta (si existe)
                if (fs.existsSync(carpetaOrigen)) {
                    ensureDirSync(path.dirname(carpetaDestino));
                    fs.renameSync(carpetaOrigen, carpetaDestino);
                }

                // Reescribir todos los paths de estudios del mismo usuario a la nueva base
                const estudiosReescritos = (usuarioOrigen.estudios || []).map(e => {
                    const nuevo = { ...e };
                    if (typeof nuevo.path === 'string' && nuevo.path.includes(baseVieja)) {
                        nuevo.path = nuevo.path.replace(baseVieja, baseNueva);
                    }
                    // NO tocar informado (se conserva tal cual)
                    return nuevo;
                });

                await Usuario.findByIdAndUpdate(id, {
                    dni: nuevoDNI,
                    clave: nuevaClave,
                    estudios: estudiosReescritos,
                });

                io.emit('cambios');
                return callback({ success: true, merged: false });
            }

            // Caso B: el DNI YA existe → FUSIONAR
            // 1) Fusionar carpetas en disco
            if (fs.existsSync(carpetaOrigen)) {
                ensureDirSync(carpetaDestino);
                moveMergeDir(carpetaOrigen, carpetaDestino);
            }

            // 2) Fusionar estudios en Mongo
            const usuarioDestino = dniDestinoDoc;
            const estudiosDestino = Array.isArray(usuarioDestino.estudios) ? usuarioDestino.estudios : [];
            const mapaDestinoPorNombre = new Map(estudiosDestino.map(e => [e.nombre, e]));

            for (const estOrigen of (usuarioOrigen.estudios || [])) {
                const destino = mapaDestinoPorNombre.get(estOrigen.nombre);
                if (destino) {
                    // Unir fotos únicas
                    const fotosUnidas = uniqueArray([...(destino.fotos || []), ...(estOrigen.fotos || [])]);

                    // Informado: true si cualquiera lo era (se conserva true)
                    const informado = Boolean(destino.informado || estOrigen.informado);

                    // Decidir path:
                    // 1) Si alguno está informado y tiene path, priorizar ese path.
                    // 2) Sino, priorizar path de destino; si no hay, usar el de origen.
                    let pathElegido;
                    if (informado) {
                        const pathInformadoDestino = destino.informado ? destino.path : undefined;
                        const pathInformadoOrigen = estOrigen.informado ? estOrigen.path : undefined;
                        pathElegido = pathInformadoDestino || pathInformadoOrigen || destino.path || estOrigen.path;
                    } else {
                        pathElegido = destino.path || estOrigen.path;
                    }

                    // Reescribir base si aplica
                    if (typeof pathElegido === 'string' && pathElegido.includes(baseVieja)) {
                        pathElegido = pathElegido.replace(baseVieja, baseNueva);
                    }

                    // Merge final
                    destino.fotos = fotosUnidas;
                    destino.informado = informado;
                    if (pathElegido) destino.path = pathElegido;

                } else {
                    // No existía ese estudio en destino → agregarlo (id único y path reescrito)
                    const nuevoEstudio = { ...estOrigen };
                    if (!nuevoEstudio.id) nuevoEstudio.id = uuidv4();

                    if (typeof nuevoEstudio.path === 'string' && nuevoEstudio.path.includes(baseVieja)) {
                        nuevoEstudio.path = nuevoEstudio.path.replace(baseVieja, baseNueva);
                    }

                    estudiosDestino.push(nuevoEstudio);
                    mapaDestinoPorNombre.set(nuevoEstudio.nombre, nuevoEstudio);
                }
            }

            usuarioDestino.estudios = estudiosDestino;

            // 3) Guardar destino y eliminar origen
            await usuarioDestino.save();
            await Usuario.findByIdAndDelete(usuarioOrigen._id);

            // 4) Emitir cambios
            io.emit('cambios');
            callback({ success: true, merged: true });
        } catch (error) {
            console.error('Error al cambiar/fusionar DNI:', error);
            callback({ success: false, error: 'Error al cambiar/fusionar DNI' });
        }
    });
});

// Inicio del servidor
const PORT = process.env.PORT || 3000;

app.post('/upload/:usuario/:estudioNombre', upload.single('file'), async (req, res) => {
    try {
        const usuarioFolder = req.params.usuario; // ej: "Perez12345678"
        const fullPath = path.join(rutaCarpeta, usuarioFolder);

        await Usuario.findOneAndUpdate(
            { "estudios.id": req.body.id },
            { $set: { "estudios.$.informado": true, "estudios.$.path": req.file.path } }
        );

        await analizarCarpeta(fullPath); // 👈 Llamada directa a la función para este usuario

        io.emit('cambios');
        res.status(200).send({ message: 'Archivo subido correctamente', file: req.file });
    } catch (error) {
        console.error('Error en /upload:', error);
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
    const hashedPassword = bcrypt.hashSync('Admin489.', 10);
    await Usuario.create({
        dni: 'admin',
        clave: hashedPassword,
        nombre: 'admin',
    });
};

//crearAdmin();

server.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);
    try {
        // Espera a que la base de datos esté conectada
        await dbConnection;
        console.log("Base de datos conectada. Analizando carpetas...");
        // Una vez conectado, analiza las carpetas
        //analizarTodasLasCarpetas();
        analizarCarpetasModificadasEn(10);
    } catch (error) {
        console.error("Error al conectar con la base de datos o analizar carpetas:", error);
    }
});
