const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const userScheme = new Schema({
    name: { type: String },
    profileImage: { type: String },
	lastName: { type: String },
    email: { type: String },
    username: { type: String },
    password: { type: String },
});
const User = mongoose.model('users', userScheme);

const postSchema = new mongoose.Schema({
    userOwn: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    description: { type: String, required: true },
    media: { type: String },
    mediaType: { type: String },
    likes: { type: Number, default: 0 },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'comments' }],
    createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'posts', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'comments' }],
    createdAt: { type: Date, default: Date.now } // Campo para la fecha de creación
});

const Post = mongoose.model('posts', postSchema);
const Comment = mongoose.model('comments', commentSchema);

module.exports = {
    User,
    Post,
    Comment
}