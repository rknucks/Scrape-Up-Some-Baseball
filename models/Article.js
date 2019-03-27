const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArticleSchema = new Schema({
    title: {
        type: String,
        unique: {
            index: { unique: true }
        },
    },
    link: {
        type: String,
        unique: true,
    },
    summary: {
        type: String
    },
    
    saved: {
        type: Boolean
    },
   
    note: {
        type: Schema.Types.ObjectId,
        ref: 'Note'
    }
});

const Article = mongoose.model('Article', ArticleSchema);

module.exports = Article;