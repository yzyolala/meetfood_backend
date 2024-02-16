// 这个文件的主要功能：
// 设置 AWS S3 的凭证。
// 定义了几个函数，用于生成上传到 S3 所需要的参数，这包括用户的头像、封面图和视频。
// 定义了生成文件 URL 的函数，这些 URL 可以用于访问在 S3 中存储的文件。
// 提供了从 S3 删除视频和封面图的功能。
// 通过这些辅助函数和配置，你可以在其他地方更方便地与 AWS S3 进行交互。

const aws = require('aws-sdk');  // 引入AWS SDK
const fs = require('fs');  // 引入文件系统模块
const config = require('../config/production');  // 引入生产环境配置文件
const { addTimeStampToName, getFileBaseName } = require('../util/path');  // 引入自定义的路径工具函数

// 初始化 AWS S3 的凭证
const setS3Credentials = new aws.S3({
  accessKeyId: config.S3AccessKeyID,
  secretAccessKey: config.S3SecretAccessKey,
});

// 生成用户头像上传到 S3 的参数
const s3ProfilePhotoParams = (req) => {
  return {
    ACL: 'public-read',
    Bucket: config.S3ProfilePhotoBucketName,
    Body: fs.createReadStream(req.file.path),
    Key: addTimeStampToName(req.file.originalname),
  };
};

// 生成用户封面图上传到 S3 的参数
const s3CustomerCoverImageParams = (req) => {
  return {
    ACL: 'public-read',
    Bucket: config.S3CoverImageBucketName,
    Body: fs.createReadStream(req.file.path),
    Key: addTimeStampToName(req.file.originalname),
  };
};

// 生成用户视频上传到 S3 的参数
const s3CustomerVideoParams = (req) => {
  return {
    ACL: 'public-read',
    Bucket: config.S3VideoBucketName,
    Body: fs.createReadStream(req.file.path),
    Key: addTimeStampToName(req.file.originalname),
  };
};

// 生成视频的 URL 地址
const videoUrlGenerator = (fileName) => {
  return `${config.S3VideoUrlPrefix}/${fileName}`;
};

// 生成产品图片的 URL 地址
const productImageUrlGenerator = (fileName) => {
  return `${config.S3CoverImageUrlPrefix}/${fileName}`;
};

// 生成用户头像的 URL 地址
const profilePhotoUrlGenerator = (fileName) => {
  return `${config.S3ProfilePhotoUrlPrefix}/${fileName}`;
};

// 从 S3 中删除视频文件
const deleteVideoInS3 = (videoUrl) => {
  const s3 = setS3Credentials;
  if (videoUrl) {
    var deleteParams = {
      Bucket: config.S3CompressedVideoBucketName,
      Key: getFileBaseName(videoUrl),
    };
    s3.deleteObject(deleteParams, (err) => {
      if (err) {
        return err;
      }
    });
  }
};

// 从 S3 中删除封面图
const deleteVideoInS3CoverImage = (imageUrl) => {
  const s3 = setS3Credentials;
  if (imageUrl) {
    var deleteParams = {
      Bucket: config.S3CoverImageBucketName,
      Key: getFileBaseName(imageUrl),
    };
    s3.deleteObject(deleteParams, (err) => {
      if (err) {
        return err;
      }
    });
  }
};

// 导出所有函数和配置，以便在其他文件中使用
module.exports = {
  setS3Credentials,
  s3ProfilePhotoParams,
  s3CustomerCoverImageParams,
  s3CustomerVideoParams,
  profilePhotoUrlGenerator,
  videoUrlGenerator,
  productImageUrlGenerator,
  deleteVideoInS3,
  deleteVideoInS3CoverImage,
};

