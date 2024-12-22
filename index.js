import express from "express"
import mongoose from 'mongoose'
import cors from 'cors'
import Listing from "./models/listing.js"
import { errorHandler } from "./utils/errorHandler.js"
import User from "./models/user.model.js"
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()


const app = express()
app.use(express.json())
app.use(cors())

mongoose.connect('mongodb+srv://cyrilmwalimuke:sMXyQAkRmjBnlAzG@cluster0.bvlef.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0').then(()=>console.log("connected to database")).catch((error)=>console.log(error))

app.get('/',(req,res)=>{
    res.send("hello world")
})
app.post('/api/listing/create',async(req,res)=>{
    try {
        const listing = await Listing.create(req.body);
        return res.status(201).json(listing);
      } catch (error) {
        console.log(error);
      }

})
app.post('/api/auth/google',async(req,res)=>{
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user) {
          const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
          const { password: pass, ...rest } = user._doc;
          res
            .cookie('access_token', token, { httpOnly: true })
            .status(200)
            .json(rest);
        } else {
          const generatedPassword =
            Math.random().toString(36).slice(-8) +
            Math.random().toString(36).slice(-8);
          const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);
          const newUser = new User({
            username:
              req.body.name.split(' ').join('').toLowerCase() +
              Math.random().toString(36).slice(-4),
            email: req.body.email,
            password: hashedPassword,
            avatar: req.body.photo,
          });
          await newUser.save();
          const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
          const { password: pass, ...rest } = newUser._doc;
          res
            .cookie('access_token', token, { httpOnly: true })
            .status(200)
            .json(rest);
        }
      } catch (error) {
        next(error);
      }
})
app.post('/api/sign-up', async (req,res,next)=>{
    const {username,email,password} = req.body
    const newUser = new User({username,email,password})
    try {
       await newUser.save()
        res.json('new user created')
        
    } catch (error) {
        next(errorHandler(409,'user already exists!'))
    }

})

app.post('/api/login',async(req,res,next)=>{
    const {email} = req.body
  try {
    const validUser = await User.findOne({email})
    if (!validUser) return next(errorHandler(404, 'User not found!'));
    const token =jwt.sign({id:validUser._id},process.env.JWT_SECRET)
    const {password:pass,...rest} = validUser._doc
    res.cookie('access_token',token,{httpOnly:true}).status(200).json(rest)
  } catch (error) {
    console.log(error)
    
  }
})
app.post('/api/update-user/:id',async(req,res)=>{
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        avatar: req.body.avatar,
      },
    },
    { new: true }
  );
  const { password, ...rest } = updatedUser._doc;

  res.status(200).json(rest);
})



app.get('/api/user/listings/:id',async(req,res)=>{
  const listings = await Listing.find({ userRef: req.params.id });
  res.status(200).json(listings);
})
app.post('/api/listing/update/:id',async(req,res,next)=>{
  const listing = await Listing.findById(req.params.id);



    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json(updatedListing);
  }

)

app.get('/api/listing/get/:id',async(req,res)=>{
  const listing = await Listing.findById(req.params.id);
  res.status(200).json(listing);
})

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
    });
  });
app.get('/api/listing/get', async(req,res)=>{
  try {
    const limit = parseInt(req.query.limit) || 9;
    const startIndex = parseInt(req.query.startIndex) || 0;
    let offer = req.query.offer;

    if (offer === undefined || offer === 'false') {
      offer = { $in: [false, true] };
    }

    let furnished = req.query.furnished;

    if (furnished === undefined || furnished === 'false') {
      furnished = { $in: [false, true] };
    }

    let parking = req.query.parking;

    if (parking === undefined || parking === 'false') {
      parking = { $in: [false, true] };
    }

    let type = req.query.type;

    if (type === undefined || type === 'all') {
      type = { $in: ['sale', 'rent'] };
    }

    const searchTerm = req.query.searchTerm || '';

    const sort = req.query.sort || 'createdAt';

    const order = req.query.order || 'desc';

    const listings = await Listing.find({
      name: { $regex: searchTerm, $options: 'i' },
      offer,
      furnished,
      parking,
      type,
    })
      .sort({ [sort]: order })
      .limit(limit)
      .skip(startIndex);

    return res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
})



app.listen(5000,(req,res)=>{
    console.log("app is running on port 5000")
})