// =====================================================
// src/controllers/classController.js — Lógica de clases
// =====================================================

const supabase = require('../config/supabase');

// =====================================================
// CREAR una clase (POST)
// =====================================================
const createClass = async (req, res) => {
    try {
        const { subject_id, title, class_date, notes } = req.body;

        // --- VALIDACIONES ---
        if (!subject_id || !title || !class_date) {
            return res.status(400).json({
                error: 'La materia, el título y la fecha de clase son obligatorios'
            });
        }

        // Verificar que la materia es del usuario
        const { data: subject } = await supabase
            .from('subjects')
            .select('id')
            .eq('id', subject_id)
            .eq('user_id', req.user.id)
            .single();

        if (!subject) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }

        // --- INSERTAR ---
        const { data: newClass, error } = await supabase
            .from('classes')
            .insert([{
                subject_id,
                title: title.trim(),
                class_date,
                notes: notes ? notes.trim() : null
            }])
            .select()
            .single();

        if (error) {
            console.error('Error al crear clase:', error);
            return res.status(500).json({ error: 'Error al crear la clase' });
        }

        res.status(201).json({
            message: 'Clase creada exitosamente',
            classData: newClass
        });
        // Usamos "classData" en vez de "class" porque "class" es una
        // palabra reservada en JavaScript (se usa para definir clases
        // de programación orientada a objetos). Si intentas usar
        // { class: newClass }, podría causar errores en algunos contextos.

    } catch (error) {
        console.error('Error en createClass:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// OBTENER clases de una materia (GET)
// =====================================================
const getClassesBySubject = async (req, res) => {
    try {
        const { subjectId } = req.params;

        // Verificar materia del usuario
        const { data: subject } = await supabase
            .from('subjects')
            .select('id')
            .eq('id', subjectId)
            .eq('user_id', req.user.id)
            .single();

        if (!subject) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }

        const { data: classes, error } = await supabase
            .from('classes')
            .select(`
        *,
        class_images ( id, image_url, file_name )
      `)
            .eq('subject_id', subjectId)
            .order('class_date', { ascending: false });
        // JOIN con class_images → Traemos las imágenes de cada clase.
        // El resultado será algo como:
        // {
        //   id: '...', title: 'Clase 1', ...,
        //   class_images: [
        //     { id: '...', image_url: 'https://...', file_name: 'foto1.jpg' },
        //     { id: '...', image_url: 'https://...', file_name: 'foto2.jpg' }
        //   ]
        // }
        //
        // Supabase maneja el JOIN automáticamente gracias a la relación
        // REFERENCES que definimos en SQL.

        if (error) {
            console.error('Error al obtener clases:', error);
            return res.status(500).json({ error: 'Error al obtener las clases' });
        }

        res.status(200).json({ classes });

    } catch (error) {
        console.error('Error en getClassesBySubject:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// OBTENER una clase específica con sus imágenes (GET)
// =====================================================
const getClassById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: classData, error } = await supabase
            .from('classes')
            .select(`
        *,
        class_images ( id, image_url, file_name ),
        subjects ( user_id, name, color )
      `)
            .eq('id', id)
            .single();

        if (error || !classData) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        // Verificar que la clase pertenece al usuario
        if (classData.subjects.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        res.status(200).json({ classData });

    } catch (error) {
        console.error('Error en getClassById:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// ACTUALIZAR una clase (PUT)
// =====================================================
const updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, class_date, notes } = req.body;

        if (!title || !class_date) {
            return res.status(400).json({
                error: 'El título y la fecha son obligatorios'
            });
        }

        // Verificar propiedad
        const { data: classData } = await supabase
            .from('classes')
            .select('id, subjects ( user_id )')
            .eq('id', id)
            .single();

        if (!classData || classData.subjects.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        const { data: updated, error } = await supabase
            .from('classes')
            .update({
                title: title.trim(),
                class_date,
                notes: notes ? notes.trim() : null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error al actualizar clase:', error);
            return res.status(500).json({ error: 'Error al actualizar la clase' });
        }

        res.status(200).json({
            message: 'Clase actualizada exitosamente',
            classData: updated
        });

    } catch (error) {
        console.error('Error en updateClass:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// SUBIR IMÁGENES a una clase (POST)
// =====================================================
const uploadClassImages = async (req, res) => {
    try {
        const { classId } = req.params;

        // Verificar propiedad de la clase
        const { data: classData } = await supabase
            .from('classes')
            .select('id, subjects ( user_id )')
            .eq('id', classId)
            .single();

        if (!classData || classData.subjects.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        // --- VERIFICAR QUE LLEGARON ARCHIVOS ---
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se enviaron imágenes' });
        }
        // req.files → Multer pone aquí los archivos subidos.
        // Es un array porque se pueden subir múltiples archivos a la vez.
        // Cada archivo tiene: buffer, originalname, mimetype, size.

        const uploadedImages = [];
        // Array donde guardaremos los datos de cada imagen subida.

        // --- SUBIR CADA ARCHIVO A SUPABASE STORAGE ---
        for (const file of req.files) {
            // "for...of" → Recorre cada elemento del array.
            // A diferencia de .forEach(), "for...of" permite usar await dentro.

            // Generar un nombre único para el archivo
            const timestamp = Date.now();
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
            const filePath = `${req.user.id}/${classId}/${timestamp}_${safeName}`;
            // Date.now() → Milisegundos desde 1970. Genera un número único.
            //
            // file.originalname → El nombre original del archivo (ej: "foto 1.jpg")
            //
            // .replace(/[^a-zA-Z0-9.]/g, '_') → Reemplaza cualquier carácter
            //   que NO sea letra, número o punto, por un guion bajo.
            //   "foto 1.jpg" → "foto_1.jpg"
            //   Esto evita problemas con caracteres especiales en URLs.
            //
            //   La regex /[^a-zA-Z0-9.]/g se lee:
            //     [^...]  → "cualquier carácter que NO esté en esta lista"
            //     a-zA-Z  → letras minúsculas y mayúsculas
            //     0-9     → números
            //     .       → punto
            //     /g      → "global", reemplaza TODAS las coincidencias
            //
            // filePath → Organizamos los archivos en carpetas:
            //   usuario_id/clase_id/timestamp_nombre.jpg
            //   Esto evita colisiones (dos archivos con el mismo nombre)
            //   y mantiene los archivos organizados por usuario y clase.

            // Subir a Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('class-images')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype
                });
            // supabase.storage → Accede al servicio de Storage.
            // .from('class-images') → Selecciona el bucket que creamos.
            // .upload(ruta, datos, opciones) → Sube el archivo.
            //
            // filePath → La ruta dentro del bucket donde se guardará.
            // file.buffer → Los datos binarios del archivo (los bytes de la imagen).
            //   "buffer" es un tipo de dato que representa datos binarios
            //   en memoria. Una imagen no es texto, es una secuencia de bytes.
            //
            // contentType: file.mimetype → El tipo de archivo.
            //   "image/jpeg" para .jpg, "image/png" para .png, etc.
            //   MIME type = Multipurpose Internet Mail Extensions type.
            //   Es el estándar para identificar tipos de archivo en internet.

            if (uploadError) {
                console.error('Error al subir imagen:', uploadError);
                continue;
                // "continue" → Salta a la siguiente iteración del for.
                // Si falla una imagen, intentamos subir las demás
                // en vez de abortar todo.
            }

            // Obtener la URL pública de la imagen
            const { data: publicUrlData } = supabase
                .storage
                .from('class-images')
                .getPublicUrl(filePath);
            // getPublicUrl() → Genera la URL pública del archivo.
            // Como el bucket es público, esta URL es accesible por cualquiera.
            // Se ve algo como:
            // https://abc123.supabase.co/storage/v1/object/public/class-images/user_id/...

            // Guardar referencia en la base de datos
            const { data: imageRecord, error: dbError } = await supabase
                .from('class_images')
                .insert([{
                    class_id: classId,
                    image_url: publicUrlData.publicUrl,
                    file_name: file.originalname
                }])
                .select()
                .single();

            if (!dbError && imageRecord) {
                uploadedImages.push(imageRecord);
                // .push() → Agrega un elemento al final del array.
            }
        }

        if (uploadedImages.length === 0) {
            return res.status(500).json({ error: 'No se pudo subir ninguna imagen' });
        }

        res.status(201).json({
            message: `${uploadedImages.length} imagen(es) subida(s) exitosamente`,
            images: uploadedImages
        });

    } catch (error) {
        console.error('Error en uploadClassImages:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// ELIMINAR una imagen de clase (DELETE)
// =====================================================
const deleteClassImage = async (req, res) => {
    try {
        const { imageId } = req.params;

        // Obtener la imagen y verificar propiedad
        const { data: image } = await supabase
            .from('class_images')
            .select('id, image_url, classes ( subjects ( user_id ) )')
            .eq('id', imageId)
            .single();
        // Aquí hacemos un JOIN anidado:
        //   class_images → classes → subjects → user_id
        // Navegamos por las relaciones para llegar al dueño.

        if (!image || image.classes.subjects.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        // Extraer la ruta del archivo desde la URL
        const urlParts = image.image_url.split('/class-images/');
        if (urlParts.length > 1) {
            const storagePath = urlParts[1];
            // La URL es algo como:
            // https://abc.supabase.co/storage/v1/object/public/class-images/user_id/class_id/file.jpg
            //
            // .split('/class-images/') la divide en dos partes:
            //   [0] = "https://abc.supabase.co/storage/v1/object/public"
            //   [1] = "user_id/class_id/file.jpg" (la ruta que necesitamos)

            // Eliminar de Supabase Storage
            await supabase.storage
                .from('class-images')
                .remove([storagePath]);
            // .remove() recibe un array de rutas a eliminar.
        }

        // Eliminar el registro de la base de datos
        const { error } = await supabase
            .from('class_images')
            .delete()
            .eq('id', imageId);

        if (error) {
            console.error('Error al eliminar imagen:', error);
            return res.status(500).json({ error: 'Error al eliminar la imagen' });
        }

        res.status(200).json({ message: 'Imagen eliminada exitosamente' });

    } catch (error) {
        console.error('Error en deleteClassImage:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// ELIMINAR una clase (DELETE)
// =====================================================
const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar propiedad
        const { data: classData } = await supabase
            .from('classes')
            .select('id, subject_id, subjects ( user_id ), class_images ( image_url )')
            .eq('id', id)
            .single();

        if (!classData || classData.subjects.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        // Eliminar imágenes de Storage antes de eliminar la clase
        if (classData.class_images && classData.class_images.length > 0) {
            const filePaths = classData.class_images
                .map(img => {
                    const parts = img.image_url.split('/class-images/');
                    return parts.length > 1 ? parts[1] : null;
                })
                .filter(path => path !== null);
            // .map() extrae las rutas de Storage de cada imagen.
            // .filter() elimina cualquier null (por si alguna URL era rara).
            //
            // Encadenamos .map().filter() → Esto se llama "method chaining"
            // (encadenamiento de métodos). Cada método retorna un nuevo array,
            // y el siguiente método opera sobre ese resultado.

            if (filePaths.length > 0) {
                await supabase.storage
                    .from('class-images')
                    .remove(filePaths);
            }
        }
        // ¿Por qué eliminar las imágenes manualmente?
        // ON DELETE CASCADE solo elimina los REGISTROS de la tabla
        // class_images. Pero los ARCHIVOS en Storage siguen ahí.
        // Debemos eliminarlos explícitamente para no dejar basura.

        // Eliminar la clase (CASCADE elimina los registros de class_images)
        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error al eliminar clase:', error);
            return res.status(500).json({ error: 'Error al eliminar la clase' });
        }

        res.status(200).json({ message: 'Clase eliminada exitosamente' });

    } catch (error) {
        console.error('Error en deleteClass:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


module.exports = {
    createClass,
    getClassesBySubject,
    getClassById,
    updateClass,
    uploadClassImages,
    deleteClassImage,
    deleteClass
};