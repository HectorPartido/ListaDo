// ============================================
// src/config/supabase.js — Conexión a Supabase
// ============================================

// Cargar las variables del archivo .env
const dotenv = require('dotenv');
dotenv.config();
// Lee el archivo .env que está en la raíz del proyecto
// y carga cada variable en "process.env".



// Importar la función para crear el cliente de Supabase
const { createClient } = require('@supabase/supabase-js');
// Esto se llama "desestructuración" (destructuring).
// La librería de Supabase exporta un objeto con varias funciones.
// Con { createClient } le decimos: "de todo lo que exportas,
// solo quiero la función createClient".


// Leer las variables de entorno
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Verificar que las variables existan
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Faltan las variables SUPABASE_URL o SUPABASE_KEY en el archivo .env');
    process.exit(1);
}

// Crear y exportar el cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);
// Esto crea la conexión. "supabase" es ahora el objeto que usaremos
// para consultar la base de datos, insertar datos, etc.

module.exports = supabase;
// ¿Qué hace module.exports?
// Hace que otros archivos puedan importar este módulo.
// Cuando en otro archivo escribamos:
//   const supabase = require('./config/supabase');
// Recibirán exactamente este objeto "supabase" ya configurado.