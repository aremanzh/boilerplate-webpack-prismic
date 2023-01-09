require("dotenv").config();

const logger = require("morgan");
const express = require("express");
const pug = require('pug');
const errorHandler = require('errorhandler');
const bodyParser= require('body-parser');
const methodOverride = require("method-override");

const fetch = require('node-fetch')
const Prismic = require('@prismicio/client')
const PrismicH = require('@prismicio/helpers')

const uaParser = require('ua-parser-js');

const app = express()
const path = require("path");
const port = 3000

app.use(logger("dev"))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(methodOverride())
app.use(errorHandler())

app.use(express.static(path.join(__dirname, 'public')))

app.set("views", path.join(__dirname, "views"))
app.set("view engine", "pug");

const handleRequest = async api => {
  const meta = await api.getSingle('meta')
  const navigation = await api.getSingle('navigation')
  const preloader = await api.getSingle('preloader')

  return {
    meta,
    navigation,
    preloader,
  }
}

// Initialize the prismic.io api
const initApi = (req) => {
    return Prismic.createClient(process.env.PRISMIC_ENDPOINT, {
      accessToken: process.env.PRISMIC_ACCESS_TOKEN,
      req,
      fetch
    })
}

// Link Resolver
const linkResolver = (doc) => {
  if (doc.type === "product") {
    return `/detail/${doc.slug}`
  }

  if (doc.type === "collections") {
    return "/collections"
  }

  if (doc.type === "about") {
    return "/about"
  }

  return '/';
}

app.use((req, res, next) => {
    // console.log(req.headers)
    const ua = uaParser(req.headers['user-agent'])
    // console.log(ua)
    res.locals.isDesktop = ua.device.type === undefined
    res.locals.isPhone = ua.device.type === 'mobile'
    res.locals.isTablet = ua.device.type === 'tablet'
  
    res.locals.link = linkResolver
  
    res.locals.PrismicH = PrismicH
    res.locals.Numbers = index => {
      return index == 0 ? "One" : index == 1 ? "Two" : index == 2 ? "Three" : index == 3 ? "Four" : "";
    }
    next()
  })

//=======================All the routes - these can have their own file/folder========================
app.get('/', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRequest(api)
  const home = await api.getSingle('home')

  const { results: collections } = await api.get({ 
    predicates: [
      Prismic.predicate.dateYear("document.first_publication_date", 2022),
      Prismic.predicate.at("document.type", "collection")
    ],
    fetchLinks: "product.image"}
  )

  console.log(defaults.navigation);

  res.render('pages/home', { 
    ...defaults,
    collections,
    home
  })
})

app.get('/about', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRequest(api)
  const about = await api.getSingle('about')

  res.render('pages/about', { 
    ...defaults,
    about
  })
})

app.get('/collections', async (req, res) => {
  const api = await initApi(req)
  const defaults = await handleRequest(api)
  const home = await api.getSingle('home')

  const { results: collections } = await api.get({ 
    predicates: [
      Prismic.predicate.dateYear("document.first_publication_date", 2022),
      Prismic.predicate.at("document.type", "collection")
    ],
    fetchLinks: "product.image"}
  )

  res.render('pages/collections', { 
    ...defaults,
    collections,
    home
  })
})
  
app.get('/detail/:uid', async (req, res) => {

  const api = await initApi(req)
  const defaults = await handleRequest(api)
  const product = await api.getByUID('product', req.params.uid, {
    fetchLinks: "collection.title"
  })

  res.render('pages/detail', { 
    ...defaults,
    product,
  })
}) 

//=====================================Undefined routes error handling==================
app.all('*', async (req, res, next) => {
    res.render('pages/Four04')
  })
  
  app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Code 500: Something Went Wrong'
    res.status(statusCode).send(err.message)
  })

app.listen(port, () => {
    console.log(`Example app listening att http://localhost:${port}`);
})