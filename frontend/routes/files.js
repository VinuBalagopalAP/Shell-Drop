const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const mime = require('mime-types');
const crypto = require('crypto');
const File = require('../models/file');
const cloudinary = require("../utils/cloudinary");
const { v4: uuidv4 } = require('uuid');
const UserAuth = require('../models/user')

// let storage = multer.diskStorage({})


let storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/') ,
  filename: (req, file, cb) => {
      // const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      var mimeType = mime.lookup(file.originalname);
		var hInfo = file.originalname + mimeType + file.size;
    var hName = crypto.createHmac('sha256', hInfo).digest('hex');
    
      const uniqueName =  hName + '.' + mime.extension(mimeType);
            cb(null, uniqueName)
  } ,
});

let upload = multer({ storage, limits:{ fileSize: 1000000 * 100 }, }).single('myfile'); //100mb

router.post('/', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).send({ error: err.message });
    }
      const file = new File({
          filename: req.file.filename,
          uuid: uuidv4(),
          path: req.file.path,
          size: req.file.size
      });
      const response = await file.save();
      res.json({ file: `${process.env.APP_BASE_URL}/files/${response.uuid}` });
    });
});


router.route("/register").post((req, res) => {
  console.log("inside the register");
  const user = new UserAuth({
    username: req.body.username,
    password: req.body.password,
    email: req.body.email,
  });
  user
    .save()
    .then(() => {
      console.log("user registered");
      res.status(200).json({ msg: "User Successfully Registered" });
    })
    .catch((err) => {
      res.status(403).json({ msg: err });
    });
});


router.route("/login").post((req, res) => {
  UserAuth.findOne({ username: req.body.username }, (err, result) => {
    if (err) return res.status(500).json({ msg: err });
    if (result === null) {
      return res.status(403).json("Username incorrect");
    }
    if (result.password === req.body.password) {
      // here we implement the JWT token functionality
      // let token = jwt.sign({ username: req.body.username }, config.key, {});

      res.json({
        // token: token,
        msg: "success",
      });
    } else {
      res.status(403).json("password is incorrect");
    }
  });
});

// multer.diskStorage({
//     // destination: (req, file, cb) => cb(null, 'uploads/') ,
//     filename: (req, file, cb) => {
//         const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
//               cb(null, uniqueName)
//     } ,
// });

// let upload = multer({ storage , limits:{ fileSize: 1000000 * 100 }, }).single('myfile'); //100mb

// let upload = multer({
//   storage: multer.diskStorage({}),
//   fileFilter: (req, file, cb) => {
//     let ext = path.extname(file.originalname);
//       if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
//       cb(new Error("File type is not supported"), false);
//       return;
//     }
//     cb(null, true);
//   },
// });


// router.post('/',upload.single("image"), async (req, res) => {
//   try {
//     // Upload image to cloudinary
//     const result = await cloudinary.uploader.upload(req.file.path);
//      // Create new user
//     // let user = new User({
//     //   name: req.body.name,
//     //   avatar: result.secure_url,
//     //   cloudinary_id: result.public_id,
//     // });
//     // // Save user
//     // await user.save();
//     // res.json(user);




//     const file = new File({
//                   filename: req.body.name,
//                   uuid: uuidv4(),
//                   path: result.secure_url,
//                   size: req.file.size
//               });
//               const response = await file.save();
//               res.json({ file:
//                 `${process.env.APP_BASE_URL}/files/${response.uuid}`             
//               });
//               // result.secure_url
              
//   } catch (err) {
//     console.log(err);
//   }
// }
// );

// (req, res) => {





//     upload(req, res, async (err) => {
//       if (err) {
//         return res.status(500).send({ error: err.message });
//       }
//         const file = new File({
//             filename: req.file.filename,
//             uuid: uuidv4(),
//             path: req.file.path,
//             size: req.file.size
//         });
//         const response = await file.save();
//         res.json({ file: `${process.env.APP_BASE_URL}/files/${response.uuid}` });
//       });

// }



router.post('/send', async (req, res) => {
  const { uuid, emailTo, emailFrom, expiresIn } = req.body;
  if(!uuid || !emailTo || !emailFrom) {
      return res.status(422).send({ error: 'All fields are required except expiry.'});
  }
  // Get data from db 
  try {
    const file = await File.findOne({ uuid: uuid });
    if(file.sender) {
      return res.status(422).send({ error: 'Email already sent once.'});
    }
    file.sender = emailFrom;
    file.receiver = emailTo;
    const response = await file.save();
    // send mail
    const sendMail = require('../services/mailService');
    sendMail({
      from: emailFrom,
      to: emailTo,
      subject: 'inShare file sharing',
      text: `${emailFrom} shared a file with you.`,
      html: require('../services/emailTemplate')({
                emailFrom, 
                downloadLink: `${process.env.APP_BASE_URL}/files/${file.uuid}?source=email` ,
                size: parseInt(file.size/1000) + ' KB',
                expires: '24 hours'
            })
    }).then(() => {
      return res.json({success: true});
    }).catch(err => {
      return res.status(500).json({error: 'Error in email sending.'});
    });
} catch(err) {
  return res.status(500).send({ error: 'Something went wrong.'});
}

});

module.exports = router;