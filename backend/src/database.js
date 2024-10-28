const mongoose = require("mongoose");

const URI = "mongodb://127.0.0.1/ecografo";

mongoose
    .connect(URI)
    .then((db) => console.log("DB is connected"))
    .catch((err) => console.error(err));

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
};