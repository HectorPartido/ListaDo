// ============================================
// server.js — Servidor principal de ListToDo
// ============================================

// Importar Express
// require() carga la librería Express que instalamos.
// La guardamos en la variable "express" para usarla.
const express = require("express");

// Crear la Aplicación
// Ejecutamos express() para crear nuestro servidor.
// "app" es ahora el objeto con el que configuramos todo.
const app = express();

// Definir el puerto
const PORT = 3000;

// Ruta principal
app.get("/", (req,res) => {
    res.send("Bienvenido a ListToDo");
})

// Encender el servidor
app.listen(PORT, () => {
    console.log("Servidor corriendo en http://localhost:${PORT}");
});