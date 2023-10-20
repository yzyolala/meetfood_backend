const mongoose = require('mongoose');               // 引入mongoose库
const Schema = mongoose.Schema;                     // 从mongoose中提取Schema构造函数

// 定义一个新的用户模式
const userSchema = new Schema({
  userId: {                                        // 用户ID
    type: String,                                  // 数据类型为字符串
    // required: true,                            // 表示此字段是必需的，但该行被注释了
  },
  email: {                                         // 电子邮件
    type: String,                                  // 数据类型为字符串
    // required: true,                            // 表示此字段是必需的，但该行被注释了
  },
  userName: {                                      // 用户名
    type: String,                                  // 数据类型为字符串
    unique: true,                                  // 表示此字段的值必须是唯一的
  },
  firstName: {                                     // 名
    type: String,                                  // 数据类型为字符串
  },
  lastName: {                                      // 姓
    type: String,                                  // 数据类型为字符串
  },
  profilePhoto: {                                  // 个人资料照片
    type: String,                                  // 数据类型为字符串
  },
  videos: [                                        // 用户发布的视频列表
    {
      videoPost: {
        type: Schema.Types.ObjectId,               // 数据类型为ObjectId，它是MongoDB中的一个特殊类型，用于存储文档的ID
        ref: 'VideoPost',                         // 参考VideoPost模型，表示此字段与VideoPost模型中的某个文档有关联
      },
    },
  ],
  collections: [                                   // 用户的视频收藏列表
    {
      videoPost: {
        type: String,                              // 数据类型为字符串，需要字符串类型以与params.videoPostId比较
        ref: 'VideoPost',                         // 参考VideoPost模型
      },
    },
  ],
  likedVideos: [                                   // 用户喜欢的视频列表
    {
      videoPost: {
        type: String,                              // 数据类型为字符串，需要字符串类型以与params.videoPostId比较
        ref: 'VideoPost',                         // 参考VideoPost模型
      },
    },
  ],
});

module.exports = mongoose.model('User', userSchema);  // 导出用户模型，这样其他文件可以引用它

