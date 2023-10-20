const User = require('../models/user');
const VideoPost = require('../models/videopost');
const AWS_S3 = require('../util/aws-s3');
const { getFileBaseName } = require('../util/path');
const config = require('../config/production');
const { adminToCDeleteUser } = require('../util/aws-cognito');


// 设置 AWS S3 凭证
const s3 = AWS_S3.setS3Credentials;

/**
 * @api {post} /api/v1/user/create CustomerCreate
 * API 文档注释
 * ...
 */
exports.customerCreate = async (req, res) => {
  // 检查请求体中的参数数量，只允许一个参数
  const numOfParams = Object.keys(req.body).length;
  if (numOfParams > 1) {
    return res.status(400).json({ errors: [{ msg: '错误请求，参数过多。' }] });
  }

  // 获取用户唯一标识符
  const userSub = req.userSub;

  try {
    // 查找是否已存在该用户
    let user = await User.findById(req.userId);

    // 如果用户已存在，返回400错误
    if (user) {
      return res.status(400).json({
        errors: [{ msg: '该用户已注册，请直接登录。' }],
      });
    }

    // 从请求体中获取电子邮箱
    const email = req.body.email;

    // 获取电子邮件的前缀（用户名部分）
    const emailPrefix = email.substring(0, email.lastIndexOf('@'));

    // 检查电子邮件前缀是否已作为用户名存在
    const isUserNameDuplicated = await User.findOne({ userName: emailPrefix });

    // 如果用户名已存在，就添加唯一标识符到用户名中
    const defaultUserName = isUserNameDuplicated
      ? emailPrefix + userSub
      : emailPrefix;

    // 创建新用户实例
    user = new User({
      userId: userSub,
      userName: defaultUserName,
      email,
      createdTime: new Date().toISOString(),
    });

    // 保存用户到数据库
    await user.save();

    // 返回成功消息和用户信息
    return res.status(200).json({
      message: '用户账号成功创建。',
      user,
    });
  } catch (err) {
    // 捕获并处理错误，返回500状态码
    res.status(500).json({ msg: '服务器错误', err: err.message });
  }
};

/**
 * @api {get} /api/v1/user/profile/me GetUserProfile
 * @apiName GetUserProfile
 * @apiGroup User
 * @apiDescription ToC Use | get user's profile
 *
 * @apiSuccess  {Object}  profile   user's profile
 * @apiError return corresponding errors
 */
exports.getCustomerProfile = async (req, res) => {
  // 1. 检查用户是否存在
  let user = await User.findById(req.userId);
  if (!user) {
    return res.status(400).json({ errors: [{ msg: '找不到该用户。' }] });
  }

  try {
    // 1. 获取基础信息：如用户名等
    /**
     * 2. 获取视频信息：使用populate方法
     * 2.1 获取用户上传的视频
     * 2.2 获取用户收藏的视频
     * 2.3 获取用户点赞的视频
     */
    // 获取用户上传的视频
    user.populate('videos.videoPost');

    // 获取用户收藏的视频
    await User.populate(user, { path: 'collections.videoPost' });
    await User.populate(user, {
      path: 'collections.videoPost.userId',
      select: ['_id', 'userId', 'userName', 'profilePhoto'],
    });
    await User.populate(user, { path: 'collections.videoPost.comments.user' });

    // 获取用户点赞的视频
    await User.populate(user, { path: 'likedVideos.videoPost' });
    await User.populate(user, {
      path: 'likedVideos.videoPost.userId',
      select: ['_id', 'userId', 'userName', 'profilePhoto'],
    });
    await User.populate(user, { path: 'likedVideos.videoPost.comments.user' });

    // 成功获取用户资料后，返回200状态码和用户信息
    return res.status(200).send(user);
  } catch (err) {
    // 捕获并处理错误，返回500状态码和错误信息
    res.status(500).send({ msg: '获取用户资料失败。', err: err.message });
  }
};

/**
 * @api {post} /api/v1/user/profile/me Update User Profile
 * @apiName Update User Profile
 * @apiGroup User
 * @apiDescription Change Customer's profile based on user input
 *
 * @apiParam (Body) {String} userName       the new user name to change
 * @apiParam (Body) {String} firstName      new First Name
 * @apiParam (Body) {String} lastName       new Last Name
 *
 * @apiError return corresponding errors
 */
exports.updateProfile = async (req, res) => {
  // 参数守卫，检查传入参数的数量，只允许3个
  const numOfParams = Object.keys(req.body).length;
  if (numOfParams > 3) {
    return res.status(400).json({
      errors: [{ msg: '错误请求，参数过多。请仅传递3个参数' }],
    });
  }

  // 从请求体中获取新的用户名、名和姓
  const newUserName = req.body.userName;
  const newFirstName = req.body.firstName;
  const newLastName = req.body.lastName;

  // 检查用户名是否唯一
  let user = await User.findOne({ userName: newUserName });

  // 如果用户名不唯一并且不属于当前用户
  if (user !== null && user.userId !== req.userSub) {
    return res.status(400).json({
      error: [{ msg: '用户名已存在，请尝试其他名字。' }],
    });
  }

  try {
    // 通过用户ID找到用户
    user = await User.findById(req.userId);

    // 更新用户资料
    user.userName = newUserName;
    user.firstName = newFirstName;
    user.lastName = newLastName;

    // 保存更改到数据库
    await user.save();

    // 返回成功信息和更新后的用户资料
    return res.status(200).json({
      message: '用户资料已更新',
      user,
    });
  } catch (err) {
    // 捕获并处理错误，返回500状态码和错误信息
    res.status(500).json({ msg: '更新资料失败', err: err.message });
  }
};

/**
 * @api {post} /api/v1/user/profile/photo UpdateUserProfilePhoto
 * @apiName UpdateUserProfilePhoto
 * @apiGroup User
 * @apiDescription ToC use | update a customer's profile photo
 *
 * @apiBody {File} binary image      the customer's profile photo
 *
 * @apiSuccess  return photo url that is stored on AWS
 * @apiError Sever Error 500 with error message
 */
exports.UpdateProfilePhoto = async (req, res) => {
  // 设置用于AWS S3的图片参数
  const imageParams = AWS_S3.s3ProfilePhotoParams(req);

  // 使用 multer 和 AWS S3 进行图片上传
  try {
    // 1. 检查用户是否存在
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(400).json({ errors: [{ msg: '找不到该用户。' }] });
    }

    // 2. 上传新的头像照片到S3
    const ImageStored = await s3
      .upload(imageParams, (err) => {
        // 检查错误
        if (err) {
          return res.status(500).json({
            errors: [
              {
                msg: '尝试上传图片到S3桶时出现错误',
                err,
              },
            ],
          });
        }
      })
      .promise();

    // 3. 如果用户已有头像，删除旧的头像
    if (user.profilePhoto) {
      // 条件判断：检查用户是否已有一个头像照片。如果有，进入代码块以删除它。

      // 1. 设置用于删除的参数
      // 创建一个对象，其中包含AWS S3桶名称和要删除的文件的键（这里是文件名）。
      var deleteParams = {
        Bucket: config.S3ProfilePhotoBucketName, // S3桶的名字
        Key: getFileBaseName(user.profilePhoto), // 文件名，通过辅助函数getFileBaseName获取
      };

      // 2. 调用 S3 的 deleteObject 方法删除头像
      // 使用AWS SDK的s3.deleteObject方法来执行删除操作。
      s3.deleteObject(deleteParams, function (err) {
        // 使用回调函数来处理删除操作的结果。

        // 3. 错误检查
        // 如果出现错误，返回一个500状态码和错误消息。
        if (err) {
          return res.status(500).json({
            errors: [
              {
                msg: '尝试从S3删除旧头像照片时出现错误', // 错误消息
                err, // 错误对象
              },
            ],
          });
        }

        // 如果没有错误，代码将继续执行（这里没有明确的成功代码块，因为这只是删除旧照片的步骤）。
      });
    }

    // 4. 获取上传后的图片文件名和URL（这一步的目的可能需要与学生讨论）
    const imageFileName = getFileBaseName(ImageStored.Location);
    const imageUrl = AWS_S3.profilePhotoUrlGenerator(imageFileName);

    // 5. 更新数据库
    user.profilePhoto = imageUrl;
    await user.save();

    // 6. 返回成功消息
    return res.status(200).json({
      message: '用户头像照片已更新',
      user,
    });
  } catch (err) {
    // 7. 捕获并处理错误，返回500状态码和错误信息
    res.status(500).json({ msg: '更新头像照片失败', err: err.message });
  }
};

/**
 * @api {delete} /api/v1/user/delete CustomerDelete
 * @apiName CustomerDelete
 * @apiGroup User
 * @apiDescription Delete New Customer
 *
 * @apiParam (Body) {String} email            the email of an delete account
 *
 * @apiSuccess (Success Returned JSON) {String}  User is created successfully
 * @apiError return corresponding errors
 */
exports.CustomerDelete = async (req, res) => {
  // database user instance/record
  // userPhoto - url - aws s3 image
  // videoPostId --> video -> aws s3 video
  // aws congito - user delete
  const email = req.body.email;

  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res
        .status(400)
        .json({ errors: [{ msg: 'The user is not found.' }] });
    }

    // Delete user Photo
    if (user.profilePhoto) {
      var deleteParams = {
        Bucket: config.S3ProfilePhotoBucketName,
        Key: getFileBaseName(user.profilePhoto),
      };
      s3.deleteObject(deleteParams, (err) => {
        if (err) {
          return res.status(500).json({
            errors: [
              {
                msg: 'Error occured while trying to delete the old profile photo from S3',
                err,
              },
            ],
          });
        }
      });
    }

    //TODO: Delete Video when we finish video APIs
    // Delete files from AWS S3
    // Delete records from DB

    await User.populate(user, {
      path: 'videos',
      populate: { path: 'videoPost', model: 'VideoPost' },
    });

    for (let v of user.videos) {
      let videoPost = v.videoPost;

      let err = AWS_S3.deleteVideoInS3(videoPost.url);

      if (err) {
        return res.status(500).json({
          errors: [
            {
              msg: 'Error occured while trying to delete the video file from S3',
              err,
            },
          ],
        });
      }

      err = AWS_S3.deleteVideoInS3CoverImage(videoPost.coverImageUrl);
      if (err) {
        return res.status(500).json({
          errors: [
            {
              msg: 'Error occured while trying to delete the cover Image from S3',
              err,
            },
          ],
        });
      }
    }

    // Delete videoPost records from DB
    await VideoPost.deleteMany({ userId: userObjectId });

    // Delete user from mongoDB
    const userObjectId = user._id;
    await User.deleteOne({ _id: userObjectId });

    // Delete account from AWS congito
    await adminToCDeleteUser(email);

    return res.status(200).json({
      message: 'User account delete successfully.',
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error', err: err.message });
  }
};

/**
 * @api {post} /api/v1/user/videos/videoCollection/:videoPostId
 * @apiName add video into collections
 * @apiGroup User
 * @apiDescription add video into collections
 *
 * @apiParam (params) {String} videoPostId
 *
 * @apiError return corresponding errors
 */
// 导出一个异步函数，用于向用户的视频收藏集合中添加视频
exports.addVideoInCollection = async (req, res) => {
  // 通过用户 ID 查找用户
  let user = await User.findById(req.userId);
  // 如果找不到用户，返回400状态码和错误消息
  if (!user) {
    return res.status(400).json({ errors: [{ msg: '找不到用户。' }] });
  }

  try {
    // 从请求参数中获取视频帖子ID
    const videoPostId = req.params.videoPostId;

    // 通过视频帖子ID查找视频帖子
    let post = await VideoPost.findById(videoPostId);
    // 如果找不到视频帖子，返回400状态码和错误消息
    if (!post) {
      return res.status(400).json({ errors: [{ msg: '没有视频帖子。' }] });
    }

    // 检查该视频是否已经被用户收藏
    if (
      user.collections.filter(
        (collection) => collection.videoPost === videoPostId,
      ).length > 0
    ) {
      // 如果已经被收藏，返回400状态码和错误消息
      return res.status(400).json({ msg: '已经收藏了这个视频' });
    }

    // 将视频ID添加到用户的收藏数组中
    user.collections.push({ videoPost: videoPostId });

    // 更新视频帖子的收藏计数
    post.countCollections += 1;

    // 保存更改到数据库
    await post.save();
    await user.save();

    // 使用 populate 方法来填充收藏中的视频帖子信息
    await User.populate(user, { path: 'collections.videoPost' });
    const collections = user.collections;

    // 返回200状态码和成功消息，以及更新后的收藏和帖子信息
    return res.status(200).json({
      message: '成功将视频添加到收藏集合',
      collections,
      post,
    });
  } catch (err) {
    // 如果出现错误，返回500状态码和错误消息
    res.status(500).json({ msg: '添加视频到收藏集合失败', err: err.message });
  }
};

/**
 * @api {delete} /api/v1/user/delete CustomerDelete
 * @apiName CustomerDelete
 * @apiGroup User
 * @apiDescription Delete New Customer
 *
 * @apiParam (Body) {String} email            the email of an delete account
 *
 * @apiSuccess (Success Returned JSON) {String}  User is created successfully
 * @apiError return corresponding errors
 */
// 导出一个异步函数，用于从集合中删除视频
exports.deleteVideoFromCollection = async (req, res) => {
  // 从请求体中获取电子邮件
  const email = req.body.email;

  try {
    // 通过用户 ID 查找用户（假设已附加到请求中）
    const user = await User.findById(req.userId);

    // 检查用户是否存在
    if (!user) {
      return res.status(400).json({ errors: [{ msg: '用户未找到。' }] });
    }

    // 如果存在，从 AWS S3 删除用户的个人资料照片
    if (user.profilePhoto) {
      var deleteParams = {
        Bucket: config.S3ProfilePhotoBucketName, // S3 桶名称
        Key: getFileBaseName(user.profilePhoto), // 文件基础名
      };

      // 删除 S3 对象
      s3.deleteObject(deleteParams, (err) => {
        if (err) {
          return res.status(500).json({
            errors: [
              {
                msg: '尝试从 S3 删除旧个人资料照片时发生错误',
                err,
              },
            ],
          });
        }
      });
    }

    // TODO: 当我们完成视频 API 时删除视频

    // 从 MongoDB 中删除用户
    const userObjectId = user._id;
    await User.deleteOne({ _id: userObjectId });

    // 从 AWS Cognito 中删除帐户
    await adminToCDeleteUser(email);

    // 返回成功状态
    return res.status(200).json({
      message: '用户帐户成功删除。',
    });
  } catch (err) {
    // 返回服务器错误
    res.status(500).json({ msg: '服务器错误', err: err.message });
  }
};


