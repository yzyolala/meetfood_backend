// 这个文件的主要功能：
// 使用 AWS SDK 初始化 AWS Cognito 服务。
// 定义一个 adminToCDeleteUser 函数，这个函数接受一个 username 参数，用于指定要删除的 Cognito 用户。
// 在函数内部，它调用 Cognito 的 adminDeleteUser 方法来实际执行删除操作。
// 如果操作成功，返回一个对象，其中 isDeleted 字段为 true。
// 如果操作失败，返回一个对象，其中 isDeleted 字段为 false，并附带错误信息。
// 这个文件通常用于与后端服务交互，特别是在处理用户注销或删除账户的逻辑时。它是与 AWS Cognito 服务交互的一个小模块

const AWS = require('aws-sdk');  // 引入 AWS SDK
const config = require('../config/production');  // 引入生产环境的配置文件

// 定义一个异步函数，用于删除 Cognito 中的用户
const adminToCDeleteUser = async (username) => {
  try {
    // 初始化 CognitoIdentityServiceProvider 对象
    const cognito = new AWS.CognitoIdentityServiceProvider();
    
    // 调用 adminDeleteUser 方法删除用户
    // Username 是要删除的用户名
    // UserPoolId 是 Cognito 用户池的 ID
    await cognito
      .adminDeleteUser({
        Username: username,
        UserPoolId: config.CognitoToCUserPoolId,
      })
      .promise();

    // 如果删除成功，返回一个对象，其中 isDeleted 为 true
    return {
      isDeleted: true,
    };
  } catch (err) {
    // 如果删除失败，返回一个对象，其中 isDeleted 为 false，并附上错误信息
    return {
      isDeleted: false,
      err: err,
    };
  }
};

// 导出 adminToCDeleteUser 函数，以便在其他文件中使用
module.exports = {
  adminToCDeleteUser,
};
