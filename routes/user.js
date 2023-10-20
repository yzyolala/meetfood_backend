const express = require('express');                        // 引入express库
const router = express.Router();                           // 创建一个新的路由对象
const UserController = require('../controllers/user');     // 引入用户控制器
const { isToCCognitoAuthenticated } = require('../middleware/is-auth'); // 引入验证是否认证的中间件
const multer = require('multer');                          // 引入multer库，用于处理文件上传
const upload = multer({ dest: 'uploads/' });               // 设置上传文件的存储位置

// 基于 Cognito 创建新客户的路由
router.post('/new', isToCCognitoAuthenticated, UserController.customerCreate);

// 获取当前登录用户的个人资料的路由
router.get(
  '/profile/me',
  isToCCognitoAuthenticated,
  UserController.getCustomerProfile,
);

// 更新当前登录用户的个人资料的路由
router.post(
  '/profile/me',
  isToCCognitoAuthenticated,
  UserController.updateProfile,
);

// 更新当前登录用户的个人资料照片的路由
router.post(
  '/profile/photo',
  upload.single('imageContent'),  // 使用multer上传名为'imageContent'的单个文件
  isToCCognitoAuthenticated,
  UserController.UpdateProfilePhoto,
);

// 从收藏中删除指定的视频的路由
router.delete(
  '/videos/videoCollection/:videoPostId',
  isToCCognitoAuthenticated,
  UserController.deleteVideoFromCollection,
);

// 将指定的视频添加到收藏的路由
router.post(
  '/videos/videoCollection/:videoPostId',
  isToCCognitoAuthenticated,
  UserController.addVideoInCollection,
);

module.exports = router;                                    // 导出路由模块，使其他文件可以引用


