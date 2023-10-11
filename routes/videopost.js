const express=require('express');
const { isToCCognitoAuthenticated } = require('../middleware/is-auth');
const router=express.Router();
const videoPostController=require('../controllers/videoPost');
const multer=require('multer');//multer 是一个用于处理文件上传的中间件，它允许你在 Express 应用程序中轻松处理文件上传和文件处理
const upload=multer({dest:'uploads/'});//dest 属性被设置为 'uploads/'，这表示上传的文件将被保存到服务器的 uploads/ 目录中。这是一个存储上传文件的临时目录。

router.get('/:videos',videoPostController.fetchVideoPost,);

router.get('/:videoPostId',isToCCognitoAuthenticated,videoPostController.getVideoPost,);

router.post('/comment/:videoPostId',isToCCognitoAuthenticated,videoPostController.postComment,);

router.post('/comment/:videoPostId/:commentId',isToCCognitoAuthenticated,videoPostController.deleteComment,);

router.put('/like/videoPostId',videoPostController.likeVideoPost,);

router.put('/unlike/videoPostId',videoPostController.unlikeVideoPost,);

//upload a new image file
router.post('/coverImage/',isToCCognitoAuthenticated,upload.single('cover-image'),videoPostController.uploadCoverImage);
//upload.single('cover-image') 表示只允许上传一个文件，并且上传的文件字段的名称是 'cover-image'

//create new video post
router.post('/new',isToCCognitoAuthenticated,videoPostController.createVideoPost);

router.delete('/customer/:videoPostId',isToCCognitoAuthenticated,videoPostController.deleteCustomerVideoPost);

module.exports=router;