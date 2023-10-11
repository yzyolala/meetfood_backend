const VideoPost = require('../models/videopost');
const User = require('../models/user');
const fs = require('fs');
const AWS_S3 = require('../util/aws-s3');
const { getFileBaseName } = require('../util/path');
const s3 = AWS_S3.setS3Credentials;

//a function to get page and size,which used for pagination
const getPagination=(page,size)=>{
    const limit=size?+size:4;
    const offset=page?page*limit:0;

    return {limit,offset};
}
//用于生成 MongoDB 查询中的排序选项对象。这个函数接受一个参数 query，通常是包含排序信息的查询参数对象。
//函数的主要目的是根据传入的 query 参数生成一个排序选项对象，以便在数据库查询中使用
const getSortOption=(query)=>{
    const sortField=query.sortBy?query.sortBy: 'popularity';
    const sortOrder=query.sortOrder? parseInt(query.sortOrder):-1;


    return {[sortField]: sortOrder, _id:-1};//返回一个包含排序选项的对象，其中排序字段是 sortField，排序顺序是 sortOrder。同时，它也包含了一个 _id 字段，将结果按照 _id 降序排列
}

/**
 * @api {get} /api/v1/video/:videoPostId GetVideoPost
 * @apiName GetVideoPost
 * @apiGroup VideoPost
 * @apiDescription ToB Use | get a videoPost with the videoPostId
 *
 * @apiParam {String} videoPost Id
 *
 * @apiSuccess  {Object} videoPost  the videoPost
 * @apiError Sever Error 500 with error message
 */
exports.getVideoPost=async (req,res)=>{
    //videopost model find the videopost by id
    //populate reference
    try{
        let videoPost= await VideoPost.findById(req.params.VideoPostId)
        .populate('comments.user')
        .exec();

        if(!videoPost){
            return res.status(404).json({
                msg:'Cannot find the video with this videoPostId.',
            });
        }
        //only select useful data
        let newComments=videoPost.comments.map((comment)=>{
            return {
                text:comment.text,
                avatar: comment.user.profilePhoto,
                name:comment.user.userName,
                user:comment.user._id,
                date:comment.date,
            }
        });
        videoPost.comments=newComments;
        res.json(videoPost);

    }catch(err){
        res.status(500).json({ err:err.message});
    }
}

/**
 * @api {post} /api/v1/video/comment/:videoPostId PostComment
 * @apiName PostComment
 * @apiGroup VideoPost
 * @apiDescription create a comment for a video post
 *
 * @apiParam {String} videoPost Id
 * *
 * @apiError Sever Error 500
 */

exports.postComment=async(req,res)=>{
    //1.find the videoPost
    //2.create comment(user reference)
    //3.push comment into videopost comment array
    try{

        const post=await VideoPost.findbyId(req.params.videoPostId);
        const user=await User.findById(req.userId);

        const newComment={
            text:req.body.text,
            user:user._id,
        };

        post.comments.unshift(newComment);
        post.countComment=post.comments.length;

        await post.save();

        res.json({
            massage:'Post Comment successfully!',
            post,
        })
    }catch(err){
        res.status(500).json({ err: err.message});
    }
}

/**
 * @api {post} /api/v1/video/comment/:videoPostId/:commentId DeleteComment
 * @apiName DeleteComment
 * @apiGroup VideoPost
 * @apiDescription delete a comment for a video post
 *
 * @apiParam {String} videoPost Id
 * @apiParam {String} comment Id
 *
 * @apiError Sever Error 500
 */

exports.deleteComment=async(req,res)=>{
    //1.check if comment exists
    //2.check if comment is written by current user
    //3.delete the comment
    //4.save and return
    try{
        const post=await VideoPost.findById(req.params.videoPostId);

        if(!videoPost){
            return res.status(404).json({
                msg:'Cannot find the video with this videoPostId.',
            });
        }

        const comment=post.comments.find(
            (comment)=>comment.id === req.params.commentId,
        );
        //check if comment exists
        if(!comment){
            return res.status(404).json({msg:'Comment does not exist.'});
        }
        //how to delete an element in js array
        //array method:splice
        //get the removeIndex
        const removeIndex=post.comments
            .map((comment)=>comment.id)
            .indexOf(req.params.commentId);

        post.comments.splice(removeIndex,1);
        post.countComment=post.comments.length;

        await post.save();

        res.sendStatus(200);
    }catch(err){
        res.status(500).json({ err: err.message});
    }
}

/**
 * @api {get} /api/v1/video/videos     Get VideoPosts
 * @apiName Get videos, including customer's videos and business videos
 * @apiGroup VideoPost
 * @apiDescription ToC use | Get videos, including customer's videos and business videos (login is optional)
 *
 * @apiQuery sortBy    sort video posts by a field. Ex. 'distance', 'popularity'
 * @apiQuery sortOrder, sort order. 1 means ascend, -1 means descend
 * @apiQuery page      the page number
 * @apiQuery size      how many products we want to query
 * @apiQuery distance  filter by distance(mile), default is 50
 *
 * @apiSuccess  {Object[]} vidoes  Array of videos
 * @apiError Sever Error 500 with error message
 */
exports.fetchVideoPost = async (req, res) => {
    const { page, size } = req.query;
    const { limit, offset } = getPagination(page, size); // 分页信息
    const sort = getSortOption(req.query); // 排序选项
  
    try {
    //   执行 MongoDB 聚合查询，VideoPost.aggregate 允许你创建一个操作管道，其中包含多个数据处理步骤，
    //   例如计算、筛选、排序等。每个步骤使用聚合操作符（例如 $addFields、$sort、$match 等）执行特定的操作，
    //   并将处理后的文档传递到下一个步骤。通过组合这些操作符，你可以构建复杂的数据处理流程，以满足不同的数据处理需求。
    //   这使得 MongoDB 的聚合查询非常灵活和强大，适用于各种复杂的数据操作任务
      const videoPosts = await VideoPost.aggregate([
        {
          // 计算每个视频帖子的流行度（popularity）
          $addFields: {
            popularity: {
              $add: [
                { $multiply: [0.7, '$countCollections'] },
                { $multiply: [0.3, '$countLike'] },
              ],
            },
          },
        },
        { $sort: sort }, // 根据排序选项排序
        { $skip: offset }, // 跳过指定数量的文档
        { $limit: limit }, // 限制返回结果的数量
      ]);
  
      // 填充用户信息
      await VideoPost.populate(videoPosts, {
        path: 'userId',
        select: ['_id', 'userId', 'userName', 'profilePhoto'],
      });
  
      // 填充评论信息并处理
      await VideoPost.populate(videoPosts, { path: 'comments.user' });
      videoPosts.map((videoPost) => {
        let newComments = videoPost.comments.map((comment) => {
          // 处理账号已删除的情况
          if (!comment.user) {
            return {
              text: comment.text,
              avatar: '',
              name: '',
              user: '',
              date: comment.date,
            };
          }
          return {
            text: comment.text,
            avatar: comment.user.profilePhoto,
            name: comment.user.userName,
            user: comment.user._id,
            date: comment.date,
          };
        });
        videoPost.comments = newComments;
      });
  
      // 返回查询到的视频帖子数据
      res.json(videoPosts);
    } catch (err) {
      // 处理错误并返回错误消息
      return res.status(500).json({
        errors: [
          {
            msg: 'Error loading videoPosts.',
            err: err.message,
          },
        ],
      });
    }
  };

/**
 * @api {put} /api/v1/video/like/:videoPostId likeVideoPost
 * @apiGroup VideoPost
 * @apiName likeVideoPost
 * @apiDescription 此路由用于ToC（服务条款）用户点赞视频帖子；同时，一个用户只能为一个视频帖子点赞一次。
 *
 * @apiParam {String} videoPostId 视频帖子的ID，用于标识要点赞的视频帖子。
 *
 * @apiSuccess {Object} 成功消息，表示视频帖子已成功点赞。
 * @apiError (Error 400) 用户未找到或视频帖子未找到的错误消息。
 * @apiError (Error 400) 已经点赞的错误消息。
 * @apiError (Error 500) 服务器错误消息。
 */
exports.likeVideoPost = async (req, res) => {
    try {
        // 1. 检查用户是否存在
        let user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(400).json({ msg: '找不到用户。' });
        }

        // 2. 通过ID查找视频帖子
        const videoPostId = req.params.videoPostId;
        const post = await VideoPost.findById(videoPostId);

        if (!post) {
            return res.status(400).json({ msg: '找不到具有此videoPostId的视频。' });
        }

        // 3. 检查用户是否已经点赞该视频帖子
        if (post.likes.find((like) => like.user && like.user.toString() === req.userId.toString())) {
            return res.status(400).json({ msg: '已经点赞了这个帖子' });
        }

        // 4. 将用户添加到帖子的点赞数组中
        post.likes.unshift({ user: req.userId });

        // 5. 更新帖子的点赞数量
        post.countLike = post.likes.length;

        // 6. 将视频帖子的ID添加到用户的likedVideos数组中，表示用户已经点赞了该视频帖子
        user.likedVideos.push({ videoPost: videoPostId });

        // 7. 保存更新后的帖子、用户，并填充帖子中的userId字段以添加作者的详细信息
        await post.save();
        await user.save();
        await VideoPost.populate(post, { path: 'userId' });

        // 8. 将更新后的帖子作为JSON响应返回
        res.json(post);
    } catch (err) {
        // 处理服务器错误
        console.error(err.message);
        res.status(500).send('服务器错误');
    }
}

/**
 * @api {put} /api/v1/video/unlike/:videoPostId unlikeVideoPost
 * @apiGroup VideoPost
 * @apiName unlikeVideoPost
 * @apiDescription 此路由用于ToC（服务条款）用户取消点赞视频帖子。
 *
 * @apiParam {String} videoPostId 视频帖子的ID，用于标识要取消点赞的视频帖子。
 *
 * @apiSuccess {Object} 成功消息，表示视频帖子已成功取消点赞。
 * @apiError (Error 400) 用户未找到的错误消息。
 * @apiError (Error 400) 视频帖子未找到的错误消息。
 * @apiError (Error 400) 帖子尚未点赞的错误消息。
 * @apiError (Error 500) 服务器错误消息。
 */
exports.unlikeVideoPost = async (req, res) => {//req和res是Express.js请求和响应对象。
    try {
        // 1. 检查用户是否存在。它使用await来等待MongoDB查询的结果，该查询使用User.findById()方法查找具有给定ID的用户。
        let user = await User.findById(req.userId);
        if (!user) {
            return res.status(400).json({ errors: [{ msg: '找不到用户。' }] });
        }

        // 2. 通过ID查找视频帖子
        const videoPostId = req.params.videoPostId;
        const post = await VideoPost.findById(videoPostId);

        if (!post) {
            return res.status(400).json({ msg: '找不到具有此videoPostId的视频。' });
        }

        // 3. 检查用户是否已经点赞该视频帖子
        const removeIndex = post.likes.map((like) => like.user).indexOf(req.userId);
        if (removeIndex === -1) {
            return res.status(400).json({ msg: '帖子尚未被点赞。' });
        }

        // 4. 从帖子的点赞数组中删除用户
        post.likes.splice(removeIndex, 1);

        // 5. 更新帖子的点赞数量
        post.countLike = post.likes.length;

        // 6. 从用户的likedVideos数组中删除videoPostId，表示用户取消了对该视频帖子的点赞
        user.likedVideos = user.likedVideos.filter((video) => video.videoPost !== videoPostId);

        // 7. 保存更新后的帖子和用户，并填充帖子中的userId字段以添加作者的详细信息
        await post.save();
        await user.save();
        await VideoPost.populate(post, { path: 'userId' });

        // 8. 返回更新后的帖子作为JSON响应
        res.json(post);
    } catch (err) {
        // 处理服务器错误
        console.error(err.message);
        res.status(500).send('服务器错误');
    }
}

/**
 * @api {post} /api/v1/video/coverImage     Upload Video Cover Image to AWS
 * @apiName Upload cover image file to AWS
 * @apiGroup VideoPost
 * @apiDescription ToC use | update a image file
 *
 * @apiBody {File} binary image File        The image to upload
 *
 * @apiSuccess  return photo url that is stored on AWS
 * @apiError Sever Error 500 with error message
 */
//是一个apidoc格式的注释，它用于描述API的行为和用途。这个注释说明了一个POST请求的路径（/api/v1/video/coverImage），
//该请求用于将视频封面图像上传到AWS S3服务。这个API需要一个名为binary image File的文件作为请求体，
//如果上传成功，它将返回一个存储在AWS上的图像的URL。如果出现错误，它将返回一个500错误和错误消息 
exports.uploadCoverImage = async (req, res) => {  
    try {  
        // 检查用户是否存在  
        const user = await User.findById(req.userId);  
        if (!user) {  
            return res  
                .status(400)  
                .json({ errors: [{ msg: 'Can not find the user.' }] });  
        }  
  
        // 上传图像文件  
        let imageUrl;  
        const imageParams = AWS_S3.s3CustomerCoverImageParams(req);  //imageParams是AWS S3上传参数，由AWS_S3.s3CustomerCoverImageParams(req)函数生成
        const imageStored = await s3.upload(imageParams, (error) => {  
                // 检查错误  
                if (error) {  
                    // 上传过程中出现错误，返回500错误和错误消息  
                    return res.status(500).json({errors: [{ msg: 'Error occured while trying to upload image to S3 bucket', error, },],});  
                }  
            })  
            .promise();//.promise()是因为AWS S3的.upload()方法返回的是一个Promise对象 
  
        // 删除已上传的文件，以清空上传文件夹。这是使用Node.js的fs模块（文件系统模块）完成的。
        //unlinkSync()是一个同步方法，它删除指定的文件。req.file.path是上传文件的路径。  
        fs.unlinkSync(req.file.path);  
  
        // 从上传的图像中提取文件名。这是通过调用getFileBaseName()函数并从imageStored.Location中提取文件名来完成的。
        //这个函数可能是在其他地方定义的，它接受一个URL并返回URL中的文件名 
        const imageFileName = getFileBaseName(imageStored.Location); 
        //生成图像的URL。这是通过调用AWS_S3.productImageUrlGenerator()函数并传入文件名来完成的。
        //这个函数可能是在其他地方定义的，它接受一个文件名并返回一个完整的S3 URL 
        imageUrl = AWS_S3.productImageUrlGenerator(imageFileName);  
  
        // 返回成功响应，包含成功消息和图像URL  
        return res.status(200).json({  
            message: 'Image is uploaded successfully',  
            imageUrl,  
        });  
    } catch (err) {  
        // 发生错误，返回500错误和错误消息  
        res.status(500).json({ msg: 'Failed to upload image', err: err.message });  
    }  
};

/**
 * @api {post} /api/v1/video/new     CreateCustomerVideo
 * @apiName Create Customer Video Post
 * @apiGroup VideoPost
 * @apiDescription ToC use | Upload Customer's video
 *
 * @apiBody {String} postTitle                the name of the video post
 * @apiBody {String} cover-image                the cover image of the video post
 * @apiBody {String} video location url         the video url
 * @apiBody {String} restaurantName           the name of the restaurant
 * @apiBody {String} orderedVia               the way the dish or video is obtained
 * @apiBody {Address} restaurantAddress       the restaurant's address
 *
 * @apiSuccess  return video url as well as the updated user object
 * @apiError Sever Error 500 with error message
 */

exports.createVideoPost = async (req, res) => {
    // // Request body validation通过req.checkBody方法，它检查请求体中的字段是否符合要求。
    //例如，它检查postTitle、imageUrl、videoUrl和restaurantName字段是否存在且不为空。
    req
      .checkBody('postTitle')
      .exists()
      .withMessage('post Title is required')
      .notEmpty()
      .withMessage('post Title is required');
    req
      .checkBody('imageUrl')
      .exists()
      .withMessage('imageUrl is required')
      .notEmpty()
      .withMessage('Empty URL');
    req
      .checkBody('videoUrl')
      .exists()
      .withMessage('videoUrl is required')
      .notEmpty()
      .withMessage('Empty URL');
    req
      .checkBody('restaurantName')
      .notEmpty()
      .withMessage('Restaurant name should not be empty');
  
    const errors = req.validationErrors();
    if (errors || errors.length > 0) {
      return res.status(400).json({ errors: errors });
    }
    //从请求体（req.body）中解构出需要的参数，
    //包括帖子的标题（postTitle）、封面图片的URL（imageUrl）、视频的URL（videoUrl）、餐厅名称（restaurantName）、餐厅地址（restaurantAddress）和获取方式（orderedVia）。
    const {
      postTitle,
      imageUrl,
      videoUrl,
      restaurantName,
      restaurantAddress,
      orderedVia,
    } = req.body;
  
    try {
      // Check if the user exists
      const user = await User.findById(req.userId);
      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Can not find the user.' }] });
      }
    // 启动一个Mongoose会话。Mongoose是一个MongoDB的对象模型工具，用于在Node.js中操作MongoDB数据库。  
    const session = await mongoose.startSession();  
    
    // 在会话中创建一个新的视频帖子，并将其保存到数据库中。  
    // 帖子的内容包括用户ID、帖子标题、封面图片URL、餐厅名称、餐厅地址、获取方式、视频URL和发帖时间。  
    await session.withTransaction(async () => {  
        const videoPost = new VideoPost({  
        userId: user.id,  
        postTitle: postTitle,  
        coverImageUrl: imageUrl,  
        restaurantName: restaurantName,  
        restaurantAddress: restaurantAddress,  
        orderedVia: orderedVia,  
        videoUrl: videoUrl,  
        postTime: new Date().toISOString(),  
        }); 
  
        await videoPost.save();
  
        user.videos.push({ videoPost: videoPost._id });
        await user.save();
    }).catch((err) => {
          session.endSession();
          console.log(err.message);
        });
  
      session.endSession();
  
      return res.status(200).json({
        message: 'Video post is created successfully',
        videoPost,
      });
    } catch (err) {
      res
        .status(500)
        .json({ msg: 'Failed to create video post', err: err.message });
    }
  };

/**
 * @api {delete} /api/v1/video/customer/:videoPostId    DeleteVideoPost
 * @apiName DeleteVideoPostForCustomer
 * @apiGroup VideoPost
 * @apiDescription ToC Use | 删除具有 videoPostId 的视频帖子
 *
 * @apiParam {String} videoPostId 视频帖子的唯一标识符
 *
 * @apiError Sever Error 500 with error message
 */
exports.deleteCustomerVideoPost = async (req, res) => {
    try {
      // 从请求参数中提取 videoPostId
      const videoPostId = req.params.videoPostId;
  
      // 通过 ID 在数据库中查找视频帖子
      const videoPost = await VideoPost.findById(videoPostId);
  
      // 检查视频帖子是否存在
      if (!videoPost) {
        return res.status(400).json({
          msg: '找不到具有此 videoPostId 的视频。',
        });
      }
  
      // 提取视频和封面图片的 URL
      const videoPostLocationUrl = videoPost.url;
      const coverImageLocationUrl = videoPost.coverImageUrl;
  
      // 查找试图删除视频帖子的用户
      let toC_user = await User.findById(req.userId);
  
      // 检查用户是否存在并且是否是视频帖子的所有者
      if (toC_user && toC_user._id.toString() !== videoPost.userId.toString()) {
        return res.status(401).json({
          msg: '在用户记录中找不到匹配的视频。',
        });
      }
  
      // 从数据库中删除视频帖子
      await VideoPost.deleteOne({ _id: videoPostId });
  
      // 从用户的视频数组中删除已删除的视频帖子
      toC_user.videos = toC_user.videos.filter(
        (video) => video.videoPost.toString() !== videoPostId,
      );
  
      // 保存更新后的用户记录
      await toC_user.save();
  
      // 尝试从 AWS S3 中删除视频文件
      let err = AWS_S3.deleteVideoInS3Compressed(videoPostLocationUrl);
  
      // 处理如果视频文件删除失败的错误
      if (err) {
        return res.status(500).json({
          errors: [
            {
              msg: '尝试从 S3 删除视频文件时发生错误',
              err,
            },
          ],
        });
      }
  
      // 尝试从 AWS S3 中删除封面图片
      err = AWS_S3.deleteImageInS3ProductImage(coverImageLocationUrl);
  
      // 处理如果封面图片删除失败的错误
      if (err) {
        return res.status(500).json({
          errors: [
            {
              msg: '尝试从 S3 删除封面图片时发生错误',
              err,
            },
          ],
        });
      }
  
      // 如果一切都成功删除，则返回成功消息
      res.status(200).json({
        msg: '视频已成功删除，相应的用户记录也已更新。',
      });
    } catch (err) {
      // 处理任何意外错误并返回带有错误消息的 500 状态
      res.status(500).json({ err: err.message });
    }
  };
  
  