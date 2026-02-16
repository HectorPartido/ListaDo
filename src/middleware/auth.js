// =====================================================
// src/middleware/auth.js — Middleware de autenticación
// =====================================================

const jwt = require('jsonwebtoken');
// Importamos jsonwebtoken para poder VERIFICAR los tokens.
// En el authController lo usamos para CREAR tokens (jwt.sign).
// Aquí lo usaremos para VERIFICAR tokens (jwt.verify).

const authMiddleware = (req, res, next) => {
    // ¿Qué es "next"?
    // Los middlewares reciben 3 parámetros: req, res, y "next".
    // "next" es una función que, cuando la llamas, le dice a Express:
    // "todo bien, pasa a la siguiente función" (la ruta final).
    //
    // Si NO llamas a next(), la petición se queda "atorada"
    // en el middleware y nunca llega a la ruta.
    //
    // El flujo es así:
    //   Petición → Middleware (¿tiene token válido?) → SÍ → next() → Ruta
    //                                                → NO → Responde 401

    try {
        // --- 1. OBTENER EL TOKEN DEL ENCABEZADO ---
        const authHeader = req.headers.authorization;
        // req.headers → Contiene todos los encabezados HTTP de la petición.
        //
        // Cuando el frontend hace una petición, envía el token así:
        //   headers: { 'Authorization': 'Bearer eyJhbGci...' }
        //
        // "Bearer" es un estándar que significa "portador".
        // Es como decir "el portador de este token es un usuario válido".
        // Es una convención de la industria, no algo inventado por nosotros.

        if (!authHeader) {
            return res.status(401).json({
                error: 'Acceso denegado. No se proporcionó token.'
            });
        }
        // Si no hay encabezado Authorization, el usuario no envió token.
        // 401 = Unauthorized (no autorizado).

        // --- 2. EXTRAER EL TOKEN ---
        const token = authHeader.split(' ')[1];
        // El encabezado viene como: "Bearer eyJhbGci..."
        //
        // .split(' ') → Divide el texto por espacios, creando un array:
        //   ["Bearer", "eyJhbGci..."]
        //
        // [1] → Tomamos el segundo elemento (índice 1), que es el token.
        //   Los arrays en JavaScript empiezan en índice 0:
        //   [0] = "Bearer"
        //   [1] = "eyJhbGci..." (el token que nos interesa)

        if (!token) {
            return res.status(401).json({
                error: 'Acceso denegado. Formato de token inválido.'
            });
        }

        // --- 3. VERIFICAR EL TOKEN ---
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // jwt.verify() hace dos cosas:
        //
        // 1. Verifica que el token fue firmado con NUESTRO JWT_SECRET.
        //    Si alguien creó un token falso con otro secreto, verify()
        //    lanzará un error y el catch lo atrapará.
        //
        // 2. Verifica que el token no haya expirado.
        //    Recuerda que al crear el token pusimos { expiresIn: '24h' }.
        //    Si ya pasaron 24 horas, verify() lanzará un error.
        //
        // Si todo está bien, retorna el "payload" (los datos dentro del
        // token): { id: "abc123", email: "hector@mail.com", iat: ..., exp: ... }
        //   iat = "issued at" (cuándo se creó)
        //   exp = "expires" (cuándo expira)

        // --- 4. ADJUNTAR EL USUARIO A LA PETICIÓN ---
        req.user = decoded;
        // Guardamos los datos del usuario decodificados en req.user.
        // Así, cualquier ruta que venga DESPUÉS del middleware puede
        // acceder a req.user.id, req.user.email, etc.
        //
        // Es como ponerle una etiqueta a la petición: "esta petición
        // viene del usuario con id X y email Y".

        // --- 5. CONTINUAR A LA RUTA ---
        next();
        // Todo bien, dejamos pasar la petición a la siguiente función.

    } catch (error) {
        // Si jwt.verify() falla (token inválido o expirado), caemos aquí.
        console.error('Error de autenticación:', error.message);
        // error.message contiene el motivo específico:
        //   "jwt expired" = el token expiró
        //   "invalid signature" = el token fue falsificado
        //   "jwt malformed" = el token no tiene el formato correcto

        res.status(401).json({
            error: 'Token inválido o expirado'
        });
    }
};

module.exports = authMiddleware;