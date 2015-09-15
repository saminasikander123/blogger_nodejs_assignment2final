let passport = require('passport')
let LocalStrategy = require('passport-local').Strategy
let nodeifyit = require('nodeifyit')
let crypto = require('crypto')
let User = require('../models/user')
let util = require('util')

require('songbird')

module.exports = (app) => {
  // let passport = app.passport

  passport.serializeUser(nodeifyit(async (user) => user._id))
  passport.deserializeUser(nodeifyit(async (id) => {
    return await User.promise.findById(id)
  }))

  passport.use('local-login', new LocalStrategy({
      usernameField: 'username',
      failureFlash: true
  }, nodeifyit(async (username, password) => {
      username = (username || '').toLowerCase()
      let user = await User.promise.findOne({username: username})
      if (!user) {
        user = await User.promise.findOne({email: username})
      }
      if (!user) {
          return [false, {message: 'Invalid username or email'}]
      }

      let passwordHash = await user.generateHash(password)
      if (passwordHash.toString('hex') !== user.password) {
          return [false, {message: 'Invalid password'}]
      }
      //if (user) console.log ('username/email & password ok')
      return user
  }, {spread: true})))

passport.use('local-signup', new LocalStrategy({
   // Find by email
   usernameField: 'email',
   failureFlash: true,
   passReqToCallback: true
 },nodeifyit(async (req, email, password) => {
   email = (email || '').toLowerCase()
   // Is the email taken?
   if (await User.promise.findOne({email: email})) {
        return [false, {message: 'That email is already taken.'}]
    }
    let {username, title, description} = req.body
    // Find by username
    let regexp = new RegExp(username, 'i')
    let query = {username: {$regex: regexp}}
    if (await User.promise.findOne(query)) {
      return [false, {message: 'That username is already taken.'}]
    }

    // create the user
    let user = new User()
    user.email = email
    user.username = username
    user.blogTitle = title
    user.blogDescription = description
    user.password = password
    // user.password = await user.generateHash(password)

    try {
      return await user.save()
    } catch(e) {
      console.log('error in saving', util.inspect(e))
      return [false, {message: e.message}]
    }
  }, {spread: true})))

}
