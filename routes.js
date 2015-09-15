let fs = require('fs')
let passport = require('passport')
let DataUri = require('datauri')
let multiparty = require('multiparty')
let then = require('express-then')
let util = require('util')
let isLoggedIn = require('./middleware/isLoggedIn')
let Post = require('./models/post')
let User = require('./models/user')
let Comment = require('./models/comment')
require ('songbird')

module.exports = (app) => {
  // let passport = app.passport

  app.get('/', then(async (req, res) => {
      // res.render('index.ejs', {message: req.flash('error')})
      res.render('index.ejs', {
        message: req.flash('error'),
        user: req.user,
        users: await User.promise.find(),
        posts: await Post.promise.find(),
        comments: await Comment.promise.find()
        })
  }))

  app.get('/login', (req, res) => {
      res.render('login.ejs', {message: req.flash('error')})
  })

  app.get('/signup', (req, res) => {
      res.render('signup.ejs', {message: req.flash('error')})
  })

  app.get('/profile', isLoggedIn, then(async (req, res) => {
    res.render('profile.ejs', {
      user: req.user,
      posts: await Post.promise.find({user: req.user}),
      comments: await Comment.promise.find({user: req.user}),
      message: req.flash('error')
    })
  }))

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
      successRedirect: '/profile',
      failureRedirect: '/login',
      failureFlash: true
  }))


  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
      successRedirect: '/profile',
      failureRedirect: '/signup',
      failureFlash: true
  }))


  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  // app.get('/post/:postId?', (req, res) => {
  app.get('/post/:postId?', isLoggedIn, then (async (req, res) => {
    let postId = req.params.postId
    if (!postId) {
      res.render('post.ejs', {
        post: {},
        verb: 'Create'
      })
      return
    }

    let post = await Post.promise.findById(postId)
    if (!post) {
      res.send(404, 'Not found')
      return
    }

    let dataUri = new DataUri()
    let image = dataUri.format('.'+ post.image.contentType.split('/').pop(), post.image.data)

    // console.log(image)
    res.render('post.ejs', {
      post: post,
      // verb: 'Edit'
      verb: (post.user == req.user.id) ? 'Edit' : 'View',
      image: `data: ${post.image.contentType};base64,${image.base64}`,
      comments: await Comment.promise.find({post: postId})
    })
  }))

  app.post('/post/:postId?', isLoggedIn, then(async (req, res) => {
    let postId = req.params.postId
    let [{title: [title], content: [content]},{image: [file]}] = await new multiparty.Form().promise.parse(req)

    if (!postId) {
      let post = new Post()
      // post.title = req.body.title
      // post.content = req.body.content
      // let [{title: [title], content: [content]},{image: [file]}] = await new multiparty.Form().promise.parse(req)

      post.user = req.user
      post.title = title
      post.content = content
      // console.log(file, title, content)
      post.image.data = await fs.promise.readFile(file.path)
      post.image.contentType = file.headers['content-type'] // mime-type
      // console.log(file, title, content, post.image)
      //return await post.save()
      await post.save()
      // res.redirect('/blog/' + encodeURI(req.user.blogTitle))
      res.redirect('/blog/' + encodeURI(req.user.id))
      return
    }

    let post = await Post.promise.findById(postId)
    if (!post) {
      res.send(404, 'Not found')
      return
    }

    post.title = title
    post.content = content
    // editing image part and create blog part
    await post.save()
    res.redirect('/blog/' + encodeURI(req.user.id))
    // console.log('TODO')
  }))

  app.delete('/post/:postId',  isLoggedIn, then(async(req, res) => {
      let postId = req.params.postId
      let post = await Post.promise.findById(postId)
      if (!post) {
          res.send(404, 'Not found')
          return
      }
      await post.remove()
      res.redirect('/blog/' + encodeURI(req.user.id))
  }))

  app.get('/blog/:userId', then(async(req, res) => {
      let userId = req.params.userId
      res.render('blog.ejs', {
          message: req.flash('error'),
          user: await User.promise.findById(userId),
          posts: await Post.promise.find({user: userId}),
          comments: await Comment.promise.find({user: userId})

      })
  }))

  app.post('/comments/:postId?',  isLoggedIn, then(async(req, res) => {
      let postId = req.params.postId

      let post = await Post.promise.findById(postId)
      if (!post) {
          res.send(404, 'Not found')
          return
      }
      let comment = new Comment()
      comment.comment = req.body.comment
      comment.post = post
      comment.user = req.user
      await comment.save()
      res.redirect('/post/' + encodeURI(post.id))
  }))

}
