const express = require('express'),
  morgan = require('morgan'),
  uuid = require('uuid');

const { check, validationResult } = require('express-validator');
//mongoose 
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const passport = require('passport');

const Models = require('./models.js');
const app = express();
require('./passport');


const Movies = Models.Movie;
const Directors = Models.Director;
const Genres = Models.Genre;
const Users = Models.User;

// mongoose.connect('mongodb://localhost:27017/myFlixDB', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });


app.use(bodyParser.json());
app.use(morgan('common'));
app.use(express.static('public'));



let allowedOrigins = ['http://localhost:8080', 'http://localhost:1234'];


app.use(cors({
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){ //if a specific origin isnt't found on the list allowed origins
        let message = 'The CORS policy for this application doesn’t allow access from origin' + origin;
        return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}));
require('./auth')(app);

app.get('/', (req, res) => {
  res.send('Welcome to myFlix!');
});

//requests related to movies
//GET request for all movies
app.get('/movies', (req, res) => {
  Movies.find()
    .then((movies) => {
      res.status(200).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//GET request for a single movie by name
app.get('/movies/:Title', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ Title: req.params.Title }),({_id: directorId }), ({ Director: req.parans.Name}), ({_id: genreId })
    .then((movies) => {
      res.json(movies);
    })
    
    .findOne({ _id: directorId })
    .populate('Directors')
    .then(directors => {
      res.json(directors);
    })
    .findOne({ _id: genreId })
    .populate('Genres')
    .then(movies => {
      res.json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//GET request for genres
app.get('/genres', passport.authenticate('jwt', { session: false }), (req, res) => {
  Genres.find()
    .then((genres) => {
      res.status(200).json(genres);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//GET request for genre by name
app.get('/genres/:Name', passport.authenticate('jwt', { session: false }), (req, res) => {
Genres.findOne({ Name: req.params.Name})
    .then((genres) => {
      res.status(200).json(genres);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//GET request for directors
app.get('/directors', passport.authenticate('jwt', { session: false }) , (req, res) => {
  Directors.find()
    .then((directors) => {
      res.status(200).json(directors);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//GET request for director by name
app.get('/directors/:Name', passport.authenticate('jwt', { session: false }),  (req, res) => {
  Directors.findOne({ Name: req.params.Name})
    .then((directors) => {
      res.status(200).json(directors);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


//requests for users
//POST request to add new users
app.post('/users', 
  [
    check('Username', 'Username is required').isLength({min: 6}),
    check('Username', 'Username has characters that are not allowed').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email is not valid').isEmail()
  ], (req, res) => {
    
    // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username }) //Search to see if a user with the requested username is already being used
      .then((user) => {
        if (user) {
          //message to display if username is already in use
          return res.status(400).send(req.body.Username + 'already exists');
        } else {
          Users
            .create({
              Username: req.body.Username,
              Password: hashedPassword,
              Email: req.body.Email,
              Birthday: req.body.Birthday
            })
            .then((user) =>{res.status(201).json(user) })
           .catch((error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
          })
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  });

// PUT Update a user's info, by username
app.put('/users/:userId', passport.authenticate('jwt', { session: false }),
[
  check('Username', 'Username is required').isLength({min:6}),
  check('Username', 'Username contains characters not allowed.').isAlphanumeric().optional(),
  check('Password', 'Password is required').not().isEmpty().optional(), //not necessary check what wa supdated and the set it
  check('Email', 'Email is not valid').isEmail().optional().normalizeEmail()
  ], (req, res) => {

// check the validation object for errors
let errors = validationResult(req);

if (!errors.isEmpty()) {
  return res.status(422).json({ errors: errors.array() });
}

  let hashedPassword = Users.hashPassword(req.body.Password);
   Users.findOneAndUpdate({ _id: req.params.usedId }, 
    { $set: {
      Username: req.body.Username,
      Password: hashedPassword, //only set what needs to be
      // Email: req.body.Email,
    }
  },
  { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if(err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});



// GET all users
app.get('/users',  passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.find()
    .then((users) => {
      res.status(200).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//GET a single user by userId
app.get('/users/:userId', (req, res) => {
  Users.findOne({ _id: req.params.UserId })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//POST method to add a movie to a user's list of favorites
app.post('/users/:userId/favorite', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate({ _id: req.params.UserId }, {
     $push: { FavoriteMovies: req.params.MovieID }
   },
   { new: true }, 
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

//DELETE request to remove movie from users favorite list
app.delete('/users/:userId/:movieId', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate({_id: req.params.userId }, {
     $pull: { FavoriteMovies: req.params.MovieID }
   },
   { new: true }, 
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser); 
    }
  });
});

// Delete a user by username
app.delete('/users/:userId', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndRemove({ _id: req.params.userId })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error not caught');
});

// listen for requests
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});





