# Copa Logística Valencia

Web del torneo de fútbol 7 entre empresas del sector logístico de Valencia.

- `index.html`: portada pública (sin cuenta). Lee en tiempo real `publico/torneo` y `jugadas` de Firestore.
- Una sola dirección: el botón «Acceso» de la portada abre el inicio de sesión (Firebase Authentication) y, con la cuenta de la organización, muestra el panel (`admin.html`, cargado dentro de la portada). Abrir `admin.html` directamente lleva a `./#panel`.
- `firestore.rules`: reglas de seguridad. Solo el UID de la organización puede leer o escribir los datos privados; `publico` y `jugadas` son de lectura pública.
- `config.js`: configuración web de Firebase (identificadores públicos, no secretos).

Alojada en GitHub Pages. El dominio de GitHub Pages debe estar en Firebase › Authentication › Settings › Authorized domains.
