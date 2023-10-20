const mongoose = require('mongoose');               // 引入mongoose库
const mongoosePaginate = require('mongoose-paginate-v2');  // 引入用于分页的mongoose插件
const constants = require('../util/constants');    // 引入常量模块
const Schema = mongoose.Schema;                     // 从mongoose中提取Schema构造函数

// 定义一个新的视频帖子模式
const videoPostSchema = new Schema(
  {
    postTitle: {                                   // 视频帖子的标题
      type: String,                                // 数据类型为字符串
      required: true,                              // 此字段是必需的
    },
    userId: {                                      // 与此视频帖子关联的用户的ID
      type: Schema.Types.ObjectId,                 // 数据类型为ObjectId
      ref: 'User',                                 // 参考User模型
    },
    videoUrl: {                                    // 视频的URL
      type: String,                                // 数据类型为字符串
      required: true,                              // 此字段是必需的
    },
    coverImageUrl: {                               // 封面图像的URL
      type: String,                                // 数据类型为字符串
    },
    restaurantName: {                              // 餐厅的名称
      type: String,                                // 数据类型为字符串
    },
    restaurantAddress: {                           // 餐厅的地址
      street: {                                    // 街道名称
        type: String,                              // 数据类型为字符串
      },
      city: {                                      // 城市名称
        type: String,                              // 数据类型为字符串
      },
      state: {                                     // 州/省的名称
        type: String,                              // 数据类型为字符串
        uppercase: true,                           // 转换为大写字母
        enum: constants.statesArray,               // 限制值必须在statesArray数组中
      },
      zipcode: {                                   // 邮政编码
        type: Number,                              // 数据类型为数字
      },
    },
    orderedVia: {                                  // 通过什么途径订购的
      type: String,                                // 数据类型为字符串
    },
    postTime: {                                    // 发帖时间
      type: Date,                                  // 数据类型为日期
      required: true,                              // 此字段是必需的
    },
    countComment: {                                // 评论计数
      type: Number,                                // 数据类型为数字
      default: 0,                                  // 默认值为0
    },
    countLike: {                                   // 点赞计数
      type: Number,                                // 数据类型为数字
      default: 0,                                  // 默认值为0
    },
    countCollections: {                            // 收藏计数
      type: Number,                                // 数据类型为数字
      default: 0,                                  // 默认值为0
    },
    likes: [                                       // 点赞的用户列表
      {
        userSub: {                                 // 用户识别码
          type: String,                            // 数据类型为字符串
        },
        user: {                                    // 用户ID
          type: Schema.Types.ObjectId,             // 数据类型为ObjectId
          ref: 'User',                             // 参考User模型
        },
      },
    ],
    comments: [                                    // 评论列表
      {
        user: {                                    // 评论用户的ID
          type: Schema.Types.ObjectId,             // 数据类型为ObjectId
          ref: 'User',                             // 参考User模型
        },
        text: {                                    // 评论内容
          type: String,                            // 数据类型为字符串
          required: true,                          // 此字段是必需的
        },
        name: {                                    // 评论用户的名字
          type: String,                            // 数据类型为字符串
        },
        avatar: {                                  // 评论用户的头像
          type: String,                            // 数据类型为字符串
        },
        date: {                                    // 评论日期
          type: Date,                              // 数据类型为日期
          default: Date.now,                       // 默认值为当前时间
        },
      },
    ],
  },
  { collection: 'videoposts' }                      // 设置MongoDB集合名称为"videoposts"
);

videoPostSchema.plugin(mongoosePaginate);           // 将分页插件添加到视频帖子模式上
module.exports = mongoose.model('VideoPost', videoPostSchema);  // 导出视频帖子模型

