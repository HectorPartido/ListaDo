// =====================================================
// src/controllers/authController.js — Lógica de autenticación
// =====================================================

// Importar librerías
const bcrypt = require('bcryptjs'); // Para encriptar y comparar contraseñas
const jwt = require('jsonwebtoken'); // Para crear tokens de sesión
const supabase = require('../config/supabase'); // Nuestra conexión a la base de datos

// =====================================================
// FUNCIÓN: Registrar un nuevo usuario
// =====================================================
const register = async (req, res) => {

    try {
        // --- 1. Extraer los datos del cuerpo de la petición ---
        const { name, email, password } = req.body;
        // req.body contiene los datos que el usuario envió.
        // Con la desestructuración { name, email, password }
        // extraemos cada campo en su propia variable.

        // --- 2. Validar que los datos existan ---
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Todos los campos son obligatorios'
            });
        }
        // res.status(400) → Establece el código de estado HTTP a 400.
        // .json({ ... }) → Envía la respuesta en formato JSON.
        // "return" detiene la ejecución de la función aquí.

        // --- 3. Validar formato del email ---
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'El formato del email no es válido'
            });
        }
        // (regex). Es un patrón que describe cómo debe verse un texto válido.
        // /^[^\s@]+@[^\s@]+\.[^\s@]+$/ se lee así:
        //   ^         → Inicio del texto
        //   [^\s@]+   → Uno o más caracteres que NO sean espacio ni @
        //   @         → Debe tener una arroba
        //   [^\s@]+   → Uno o más caracteres que NO sean espacio ni @
        //   \.        → Debe tener un punto (el \ "escapa" el punto)
        //   [^\s@]+   → Uno o más caracteres que NO sean espacio ni @
        //   $         → Fin del texto
        //
        // Básicamente verifica: "algo@algo.algo"
        // .test(email) → Prueba si el email cumple el patrón. Retorna true o false.

        // --- 4. Validar la longitud de la contraseña ---
        if (password.length < 6) {
            return res.status(400).json({
                error: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // --- 5. Verificar que el email no este registrado ---
        const { data: existingUser, error: searchError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        // ¿Qué hace esta consulta?
        // Le pregunta a Supabase: "busca en la tabla 'users' si ya existe
        // alguien con este email".
        //
        // .from('users')    → En la tabla "users"
        // .select('id')     → Solo trae la columna "id" (no necesitamos todo)
        // .eq('email', email) → Donde "email" sea igual al email que nos enviaron
        //   "eq" = "equals" = "igual a"
        // .single()         → Espera un solo resultado (o ninguno)
        //
        // "await" → Espera a que Supabase responda antes de continuar.
        //   Recuerda que Supabase está en la nube, así que la respuesta
        //   no es instantánea. "await" pausa esta línea hasta que llegue
        //   la respuesta, pero NO congela el servidor (gracias a async).
        //
        // { data: existingUser, error: searchError } → Supabase siempre
        //   retorna un objeto con "data" (los datos) y "error" (si hubo error).
        //   Con ": existingUser" renombramos "data" a "existingUser" para
        //   que sea más claro qué contiene.

        if (existingUser) {
            return res.status(400).json({
                error: 'Este email ya está registrado'
            });
        }
        // Si encontró un usuario, significa que el email ya existe.

        // --- 6. Encriptar la contraseña ---
        const salt = await bcrypt.genSalt(10); // 10 caracteres random
        const hashedPassword = await bcrypt.hash(password, salt);
        // Se usa Salt para añadir un texto random a la contraseña ANTES de encriptar

        // --- 7. Guardar el usuario en la base de datos ---
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    name: name,
                    email: email,
                    password: hashedPassword // Contraseña encriptada
                }
            ])
            .select() // Después de insertar, devuélveme los datos insertados
            .single(); // Solo espero un resultado

        // Mostrar error en la terminal
        if (insertError) {
            console.error('Error al insertar usuario:', insertError);
            return res.status(500).json({
                error: 'Error al crear el usuario'
            });
        }

        // --- 8. Crear el token JWT ---
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        // ¿Qué hace jwt.sign()?
        // Crea un token (una cadena larga de texto) que contiene información del usuario de forma segura.
        // Primer argumento: { id, email }
        //   → Los datos que queremos "guardar" dentro del token.
        //   Esto se llama el "payload" (carga útil).
        //
        // Segundo argumento: process.env.JWT_SECRET
        //   → La clave secreta para firmar el token. Solo nuestro
        //   servidor conoce esta clave.

        // --- 9. Responder con éxito ---
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            },
            token: token
        });
        // Respondemos con código 201 (Created = se creó algo nuevo).
        // Enviamos los datos del usuario (SIN la contraseña) y el token.

    } catch (error) {
        // --- Manejo de errores inesperados ---
        console.error('Error en registro:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};


// =====================================================
// FUNCIÓN: Iniciar sesión
// =====================================================
const login = async (req, res) => {
    try {
        // --- 1. Extraer datos ---
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email y contraseña son obligatorios'
            });
        }

        // --- 2. Buscar usuario por email ---
        const { data: user, error: searchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(401).json({
                error: 'Email o contraseña incorrectos'
            });
        }

        // --- 3. Comparar la contraseña ---
        const isValidPassword = await bcrypt.compare(password, user.password);
        // bcrypt.compare() toma la contraseña que el usuario escribió
        // y la compara con el hash guardado en la base de datos.

        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Email o contraseña incorrectos'
            });
        }

        // --- 4. Crear el token ---
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // --- 5. Responder con éxito ---
        res.status(200).json({
            message: 'Inicio de sesión exitoso',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            token: token
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
};


// --- Exportar las funciones ---
module.exports = { register, login };
// Exportamos ambas funciones como un objeto.
// Cuando otro archivo haga:
//   const { register, login } = require('./controllers/authController');
// Tendrá acceso a ambas funciones.