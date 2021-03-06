const express = require('express')
const exphbs = require('express-handlebars')
const bodyParser = require('body-parser')
const axios = require('axios')
const logger = require('morgan')
const cheerio = require('cheerio')
const request = require('request')
const mongoose = require('mongoose');

// set port
const port = process.env.PORT || 3000;

// require all models
const db = require('./models');


// MIDDLEWARE

// initialize express
const app = express();

// configure handlebars as view engine
app.engine('.hbs', exphbs({ extname: '.hbs', defaultLayout: 'main' }));
app.set('view engine', '.hbs');

// configure body parser to parse requests as json
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// configure morgan to log requests to console
app.use(logger('dev'));

// serve up 'public' folder
app.use(express.static('public'));

// =====================================================================================
// MONGOOSE CONFIG
// =====================================================================================
// set up mongoose to leverage built-in JavaScript ES6 Promises
mongoose.Promise = Promise;

// if deployed, use the deployed database. else, use the local mongoHeadlines database.
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
// connect to the MongoDB
mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('Successfully connected to Mongo database');
})
.catch(err => {
    console.error(err);
});

// Routes
app.get('/', (req, res) => {
    db.Article.find({})
    .then(dbArticles => {
        res.render('index', { articles: dbArticles });
    })
    .catch(err => {
        console.log(err);
    });
});

// A GET route for scraping the website
app.get("/scrape", function(req, res) {
    // First, we grab the body of the html with axios
    axios.get("https://www.mlb.com/news").then(function(response) {
      // Then, we load that into cheerio and save it to $ for a shorthand selector
      var $ = cheerio.load(response.data);


    // console.log(response)

      // Now, we grab every h2 within an article tag, and do the following:
      $("article").each(function(i, element) {
        // Save an empty result object
        var result = {};
        

        result.title = $(this).find("h1").text().trim();
        result.link = $(this).find("a").attr("href")
        result.summary = $(this).find("div.article-item__preview").text().trim();

        
        db.Article.create(result)
        .then(newArticles => {
            console.log('scrape complete!');
            console.log(newArticles)
            res.redirect('/');
        })
        .catch(err => {
            throw err;
        });

    });
    
});
});

app.get('/saved', (req, res) => {
    db.Article.find({ saved: true })
    .then(savedArticles => {
        res.render('saved', { articles: savedArticles });
    })
    .catch(err => {
        console.log(err);
    });
});

app.get('/api/articles/:id', (req, res) => {
    id = req.params.id;
    db.Article.findOneAndUpdate({ _id: id }, { saved: true }, { new: true })
    .populate('note')
    .then(dbArticle => {
        res.send(dbArticle);
    })
    .catch(err => {
        console.error(err);
    });
})

app.post('/api/articles/:id', (req, res) => {
    id = req.params.id;
    db.Note.create(req.body)
    .then(newNote => {
        console.log(newNote);
        return db.Article.findOneAndUpdate({ _id: id }, { note: newNote._id }, { new: true });
    })
    .then(updatedArticle => {
        res.send(updatedArticle);
    })
    .catch(err => {
        console.log(err);
    });
});

app.get('/api/unsave/:id', (req, res) => {
    id = req.params.id;
    db.Article.findOneAndUpdate({ _id: id }, { $unset: { note: '', saved: '' }}, { new: true })
    .then(unsavedArticle => {
        console.log(`article ${unsavedArticle._id} saved: ${unsavedArticle.saved}`);
        res.send(unsavedArticle);
    })
    .catch(err => {
        console.error(err);
    });
});

app.get('/api/clear', (req, res) => {
    db.Article.remove({})
    .then(articleResponse => {
       return db.Note.remove({});
    })
    .then(noteResponse => {
        console.log('articles & notes removed!');
        res.send('articles & notes removed!');
    })
    .catch(err => {
        console.log(err);
        res.send(err);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`App running on port ${port}`);
});