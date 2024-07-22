const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const app = express()
const { User } = require('../models/models')

// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = new Date().toISOString().replace(/[-T:.Z]/g, '');
        const fileExtension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${fileExtension}`);
    }
});
const upload = multer({ storage: storage });

app.post('/register', upload.single('profileImage'), async (req, res) => {
    const requiredFields = ['name', 'lastName', 'email', 'username', 'password'];
    const missingFields = requiredFields.filter(field => !(field in req.body));

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Faltan campos requeridos en la solicitud",
            missingFields
        });
    }

    const { name, lastName, email, username, password } = req.body;
    let profileImage = '';

    if (req.file) {
        profileImage = req.file.filename;
    }

    try {
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            const existingField = user.email === email ? 'email' : 'username';
            return res.status(400).json({
                success: false,
                message: `El ${existingField} ya está registrado`
            });
        }


        user = new User({ name, profileImage, lastName, email, username, password });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.status(200).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// Actualización de usuario
app.put('/update/:id', upload.single('profileImage'), async (req, res) => {
    const { name, lastName, email, username, password } = req.body;
    const updatedData = {};

    if (name) updatedData.name = name;
    if (lastName) updatedData.lastName = lastName;
    if (email) updatedData.email = email;
    if (username) updatedData.username = username;
    if (password) {
        const salt = await bcrypt.genSalt(10);
        updatedData.password = await bcrypt.hash(password, salt);
    }
    if (req.file) {
        updatedData.profileImage = req.file.filename;
    }

    try {
        // Validar que el nuevo email o username no existan en otros usuarios
        let userWithEmail = await User.findOne({ email });
        if (userWithEmail && userWithEmail._id.toString() !== req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        let userWithUsername = await User.findOne({ username });
        if (userWithUsername && userWithUsername._id.toString() !== req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'El username ya está registrado'
            });
        }

        let user = await User.findByIdAndUpdate(req.params.id, { $set: updatedData }, { new: true });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            user
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// Login de usuario
app.post('/login', async (req, res) => {
    const requiredFields = ['username', 'password'];
    const missingFields = requiredFields.filter(field => !req.body.hasOwnProperty(field));

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Faltan campos requeridos en la solicitud",
            missingFields
        });
    }

    const { username, password } = req.body;

    try {
        let user = await User.findOne({ username }).lean()
        if (!user) {
            return res.status(403).json({
                success: false,
                message: 'Usuario o contraseña incorrectas, por favor verifique'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.header({
                "content-type": "application/json"
            }).status(403).json({
                success: false,
                message: 'Usuario o contraseña incorrectas, por favor verifique'
            });
        }
        delete user.password;
        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            user
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// Servir imágenes
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));
module.exports = app