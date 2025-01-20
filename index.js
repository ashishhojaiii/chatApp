const express = require("express");
const http= require("http");
const app = express();
const server = http.createServer(app);
const socketIo = require("socket.io");
const path = require("path")
const io = socketIo(server)
const multer = require("multer")
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
app.use('/uploads', express.static('uploads'));




app.use(express.static(path.join(__dirname, "public"))); // Serve static files

app.get("/serviceworker.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.sendFile(path.join(__dirname, "serviceworker.js"));
});

app.get("/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.sendFile(path.join(__dirname, "manifest.json"));
});



const transporter = nodemailer.createTransport({

    service:'gmail' , 
    auth:{
        user:'ashishhojai1@gmail.com' , 
        pass:'yfoh fwqh ffww cxzs'
    }
})

/*const mailOptions={
    from:
        'ashishhojai1@gmail.com' , 
        to:
        'financialhighlife@gmail.com',
        subject:'test email', 
        text:'This is a test email'
    
}*/



const storage = multer.diskStorage({
    destination:(req , file ,  cb)=>{ cb(null , './uploads')},
    filename:(req , file ,  cb)=>{ cb(null , file.originalname)}
})
const upload = multer({storage:storage})





mongoose.connect("mongodb://localhost:27017/chatApp" , {
    useNewUrlParser:true , 
    useUnifiedTopology:true
}).then(()=>{
    console.log("successfully connceted to database")
}).catch(()=>{
    console.log('error while connecting to datbase')
})

const UserSchema = new mongoose.Schema({
    username:String,
    email:String,
    profilepic:String,
    sender:String , 
    receiver:String , 
    online:Boolean,
    socketid:String,
    phone:String,
    favseries:String,
    friendsphone:[String],
})

const User = mongoose.model('user' , UserSchema)
app.get("/" , (req , res)=>{
res.sendFile(path.join(__dirname , 'registration.html'))
})

//<------------------------------------------------------------------->
app.post('/' ,upload.none() ,  (req , res)=>{
const {username , phone , email} = req.body;
//console.log(username)
const newUser = new User(
    {
        username,
        phone,
        email
    
    }


)
newUser.save().then((savedUser)=>{
    res.json({url:`/All-Users`})
})

})


app.get("/chatArea/:sender/:receiver" , (req , res)=>{
    res.sendFile(path.join(__dirname , 'index.html'))
})

//SAVING SENDER , RECEIVER AND SOCKET ID TO DATABASE-
//BEFORE CLICKING ON SEND BUTTON 
//THATS HOW WE KNOW THE CURRENT SOCKET ID , THE USER IS CONNECTED-IN

app.post("/chatArea/:sender/:receiver" ,upload.none(),  (req , res)=>{
    const {sender , receiver , socketid} = req.body;
    User.findOneAndUpdate({username:sender},
        {
            $set:{
                sender:sender,
                receiver:receiver,
                socketid:socketid
            }
        },
        {new:true}
    ).then((updatedUser)=>{
        console.log(updatedUser.online)
       // res.json({success:true , online:updatedUser.online})
    })
    })




app.post("/api/:sender/:receiver" , upload.none() , (req , res)=>{
    const {message} = req.body;
    const receiver = req.params.receiver
    console.log("This is message" , message , receiver)

User.findOne({username:receiver}).then((receiver)=>{
    console.log("RECEIVER:" , receiver.online)
    res.json({success:true , online:receiver.online})

   /* if(!receiver.online){
        console.log('Receiver is not online')
    }*/
})


})

io.on("connection" , (socket)=>{
    console.log("a user connected" , socket.id)


    socket.on('msg' , (msg)=>{
        console.log(
            'message sent by' , msg.sender, 'to', msg.receiver , msg.message)

User.findOne({username:msg.receiver}).then((receiver)=>{
    if(!receiver.online){
        const mailOptions={
            from:
                'ashishhojai1@gmail.com' , 
                to:
                `${receiver.email}`,
                subject:`${receiver.receiver} send a message to you`, 
                text:`${receiver.receiver} is online go chat with him`
        }
        transporter.sendMail(mailOptions , (error, info)=>{
            if(error){
                console.log('Error occured' , error)
            }else{
                console.log('email sent:' , info.response)
            }
        })


    }
})


            
socket.on('disconnect' , ()=>{
    console.log(msg.sender , "user diconnected....")

    User.findOneAndUpdate({username:msg.sender}, 
        {
            $set:{
                online:false
            }
        },
        {new:true}
    ).then((disconnectedUser)=>{
        console.log(disconnectedUser)


     






    })

})

    
User.findOneAndUpdate({username:msg.sender}, 
    {
        $set:{
            online:true
        }
    },
    {new:true}
).then((user)=>{
    console.log(user.username)
}).catch((err)=>{
    console.log(err)
})
       User.findOne({username:msg.receiver}).then((user)=>{
        console.log(user.email)

 

        console.log(user.socketid)
        io.to(user.socketid).emit('pm', {
            text:msg.message
        })
       })
       
    })
})


app.get("/All-Users" , (req , res)=>{
    res.sendFile(path.join(__dirname , 'displayingUser.html'))
})

app.get('/get-users' , (req , res)=>{
const {username} = req.query;
console.log(username)
User.findOne({username:username}).then((sender)=>{
    User.find({phone:{$in:sender.friendsphone}},{username:1 , profilepic:1}).then(users=>{
        res.json({users})
   /* users.forEach(element => {
        console.log(element)
        res.json({profilepic:element.profilepic})
    });*/
    })
})
})

app.post('/add-contacts' ,upload.none(),  (req , res)=>{
    const {phone , sender} = req.body;
    User.findOneAndUpdate({username:sender},
{
    $push:{
        friendsphone:phone
    }
}
    ).then((updatedUser)=>{
        console.log(updatedUser)
    })

})


app.get("/favseries" , (req , res)=>{
    res.sendFile(path.join(__dirname , 
        'favseries.html'
    ))
})


app.post('/fav-series' , upload.single('favseries'),(req , res)=>{
    const favseries = req.file.filename
    const {sender} = req.body
    
    User.findOneAndUpdate({username:sender},
        {
            $set:{
                favseries
            }
        },
        {new:true}
    ).then((updatedUser)=>{
        console.log(updatedUser)
    })
    console.log(sender)
    
    res.json({url:'/All-Users'})
    })


app.get("/editprofile" , (req , res)=>{
    res.sendFile(path.join(__dirname , 
        'editprofile.html'
    ))
})

app.post('/update-profile' , upload.single('profilepic'),(req , res)=>{
const profilepic = req.file.filename
const {sender} = req.body

User.findOneAndUpdate({username:sender},
    {
        $set:{
            profilepic
        }
    },
    {new:true}
).then((updatedUser)=>{
    console.log(updatedUser)
})
console.log(sender)

res.json({url:'/All-Users'})
})



app.get('/get-user-profile-pic/:sender' , (req , res)=>{
    const {sender} = req.params;
    User.findOne({username:sender}).then((user)=>{
        console.log(user.profilepic)
        res.json({ 
            
            profilepic: `/uploads/${user.profilepic}` ,
            favseries:`/uploads/${user.favseries}`,
        
        });

    })
})


app.get("/login" , (req , res)=>{
    res.sendFile(path.join(__dirname , 'login.html'))
})


app.post('/login' , upload.none() , (req , res)=>{
    const {phoneno} = req.body
    console.log(phoneno)

User.findOne({phone:phoneno}).then((user)=>{
    if(user){
        res.json({url:'/All-Users' ,username:user.username})

    }
    else{
        res.json({error:'User not present'})
    }
})


})


if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/serviceworker.js').then((registration)=>{
        console.log('Service worker registered' , registration)
    }).catch((error)=>{
        console.log("Service worker registration failed" , error)
    })
}

server.listen(8080, ()=>{
    console.log("listening at 8080")
})