const mongoose = require("mongoose");

const URI = "mongodb://127.0.0.1/ecografo";

const dbConnection = mongoose.connect(URI);

dbConnection
    .then(() => console.log("DB is connected"))
    .catch((err) => console.error("DB connection error:", err));

const { Schema } = mongoose;

const Usuario = new Schema(
    {
        dni: {
            type: String,
            unique: true,
        },
        nombre: String,
        clave: String,
        estudios: Array,
    },
    { timestamps: true }
);

module.exports = {
    Usuario: mongoose.model("Usuario", Usuario),
    dbConnection, // Exporta la promesa de conexión
};