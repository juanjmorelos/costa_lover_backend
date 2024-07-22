
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const { User, Post, Comment } = require('../models/models')

const router = express()

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const saveFile = (fileBuffer, filename) => {
    const filePath = path.join(__dirname, '..', '..', 'uploads', filename);
    fs.writeFileSync(filePath, fileBuffer);
};

const formatDate = (date) => {
    const now = moment();
    const diff = now.diff(date);
    const duration = moment.duration(diff);

    if (duration.asHours() < 24) {
        return moment(date).fromNow();
    } else {
        return moment(date).format('DD [de] MMMM [de] YYYY');
    }
};

router.post('/create', upload.single('media'), async (req, res) => {
    const requiredFields = ['userOwn', 'description'];
    const missingFields = requiredFields.filter(field => !(field in req.body));

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Faltan campos requeridos en la solicitud",
            missingFields
        });
    }

    const { userOwn, description } = req.body;
    let media = '';
    let mediaType = '';

    const fileBuffer = req.file ? req.file.buffer : null;
    if (!fileBuffer) {
        return res.status(400).json({
            success: false,
            message: "El archivo multimedia es obligatorio"
        });
    }

    const uniqueSuffix = new Date().toISOString().replace(/[-T:.Z]/g, '');
    const fileExtension = path.extname(req.file.originalname);
    media = `${uniqueSuffix}${fileExtension}`;
    mediaType = req.file.mimetype.startsWith('image') ? 'image' : 'video';

    try {
        const post = new Post({ userOwn, description, media, mediaType, createdAt: new Date() });
        await post.save();

        // Guardar la imagen o video solo después de que la publicación se haya guardado exitosamente
        if (fileBuffer) {
            saveFile(fileBuffer, media);
        }

        res.status(201).json({
            success: true,
            message: 'Publicación creada exitosamente',
            post
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// Comentar en una publicación
router.post('/comment/:postId', async (req, res) => {
    const requiredFields = ['user', 'text'];
    const missingFields = requiredFields.filter(field => !(field in req.body));

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Faltan campos requeridos en la solicitud",
            missingFields
        });
    }

    const { user, text } = req.body;
    const { postId } = req.params;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Publicación no encontrada'
            });
        }

        const comment = new Comment({ post: postId, user, text, createdAt: new Date() });
        await comment.save();

        post.comments.push(comment);
        await post.save();

        res.status(201).json({
            success: true,
            message: 'Comentario agregado exitosamente',
            comment
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// Responder a un comentario
router.post('/comment/reply/:commentId', async (req, res) => {
    const requiredFields = ['user', 'text'];
    const missingFields = requiredFields.filter(field => !(field in req.body));

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Faltan campos requeridos en la solicitud",
            missingFields
        });
    }

    const { user, text } = req.body;
    const { commentId } = req.params;

    try {
        const parentComment = await Comment.findById(commentId);
        if (!parentComment) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado'
            });
        }

        const reply = new Comment({ post: parentComment.post, user, text, createdAt: new Date() });
        await reply.save();

        parentComment.replies.push(reply);
        await parentComment.save();

        res.status(201).json({
            success: true,
            message: 'Respuesta agregada exitosamente',
            reply
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// Servir medios (imágenes o videos)
router.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

router.get('/post/all', async (req, res) => {
    try {
        const posts = await Post.find()
        .populate('userOwn', 'name lastName username profileImage')
        .populate({
            path: 'comments',
            populate: [
                {
                    path: 'user',
                    select: 'name lastName username profileImage'
                },
                {
                    path: 'replies',
                    populate: {
                        path: 'user',
                        select: 'name lastName username profileImage'
                    }
                }
            ]
        });



        const formattedPosts = posts.map(post => ({
            ...post.toObject(),
            createdAt: formatDate(post.createdAt),
            comments: post.comments.map(comment => ({
                ...comment.toObject(),
                createdAt: formatDate(comment.createdAt),
                replies: comment.replies.map(reply => ({
                    ...reply.toObject(),
                    createdAt: formatDate(reply.createdAt)
                }))
            }))
        }));

        res.status(200).json({
            success: true,
            message: 'Publicaciones obtenidas exitosamente',
            posts: formattedPosts
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// Obtener publicaciones por usuario
router.get('/post/byUser/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const posts = await Post.find({ userOwn: userId })
            .populate('userOwn', 'name lastName username profileImage')
            .populate({
                path: 'comments',
                populate: [
                    {
                        path: 'user',
                        select: 'name lastName username profileImage'
                    },
                    {
                        path: 'replies',
                        populate: {
                            path: 'user',
                            select: 'name lastName username profileImage'
                        }
                    }
                ]
            });

        const formattedPosts = posts.map(post => ({
            ...post.toObject(),
            createdAt: formatDate(post.createdAt),
            comments: post.comments.map(comment => ({
                ...comment.toObject(),
                createdAt: formatDate(comment.createdAt),
                replies: comment.replies.map(reply => ({
                    ...reply.toObject(),
                    createdAt: formatDate(reply.createdAt)
                }))
            }))
        }));

        res.status(200).json({
            success: true,
            message: 'Publicaciones del usuario obtenidas exitosamente',
            posts: formattedPosts
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

router.post('/like/:postId', async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Publicación no encontrada'
            });
        }

        post.likes += 1;
        await post.save();

        res.status(200).json({
            success: true,
            message: 'Like agregado a la publicación',
            likes: post.likes
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// Dar like a un comentario
router.post('/comment/like/:commentId', async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comentario no encontrado'
            });
        }

        comment.likes += 1;
        await comment.save();

        res.status(200).json({
            success: true,
            message: 'Like agregado al comentario',
            likes: comment.likes
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

module.exports = router


