const express=require('express');                        // 引入express库
const { isToCCognitoAuthenticated } = require('../middleware/is-auth'); // 从中间件中引入验证是否通过Cognito认证的功能
const router=express.Router();                           // 创建一个新的路由对象
const videoPostController=require('../controllers/videoPost');     // 引入与视频帖子相关的控制器
const multer=require('multer');                          // 引入multer库，用于处理文件上传
const upload=multer({dest:'uploads/'});                  // 设置上传文件的存储位置为'uploads/'目录

router.get('/:videos',videoPostController.fetchVideoPost,);  // 获取视频帖子列表

router.get('/:videoPostId',isToCCognitoAuthenticated,videoPostController.getVideoPost,);  // 获取指定ID的视频帖子

router.post('/comment/:videoPostId',isToCCognitoAuthenticated,videoPostController.postComment,);  // 在指定的视频帖子下发布评论

router.post('/comment/:videoPostId/:commentId',isToCCognitoAuthenticated,videoPostController.deleteComment,);  // 删除指定视频帖子下的评论

router.put('/like/videoPostId',videoPostController.likeVideoPost,);  // 给指定的视频帖子点赞

router.put('/unlike/videoPostId',videoPostController.unlikeVideoPost,);  // 取消给指定的视频帖子的点赞

// 为指定的视频帖子上传新的封面图像
router.post('/coverImage/',isToCCognitoAuthenticated,upload.single('cover-image'),videoPostController.uploadCoverImage);  // upload.single('cover-image') 表示只上传一个名为'cover-image'的文件

// 创建新的视频帖子
router.post('/new',isToCCognitoAuthenticated,videoPostController.createVideoPost);

// 删除客户发布的指定ID的视频帖子
router.delete('/customer/:videoPostId',isToCCognitoAuthenticated,videoPostController.deleteCustomerVideoPost);

module.exports=router;                                     // 导出路由模块，使其他文件可以使用这些路由设置
