// 导入所需的模块
const CognitoExpress = require('cognito-express');
const User = require('../models/user');
const config = require('../config/production');
const jwt = require('jsonwebtoken');

// 初始化 CognitoExpress 构造函数
/**
 * !!!重要提示!!!
 * 如我们在课堂上提到的，以下值仅用于解锁后端开发。
 * 因此，我们将很快删除以下服务。
 * 为了避免您的应用程序出现问题，请在前端课程中创建自己的 AWS Cognito 服务后替换以下值。
 */
const cognitoExpressToC = new CognitoExpress({
  region: config.CognitoRegion, // AWS 区域
  cognitoUserPoolId: config.CognitoToCUserPoolId, // 用户池ID
  tokenUse: config.CognitoTokenUse, // token 使用类型: access 或 id
  tokenExpiration: config.CognitoTokenExpiration, // token 过期时间，默认为1小时（3600000毫秒）
});

// 检查 token 是否经过 Cognito 身份验证的中间件
function isToCCognitoAuthenticated(req, res, next) {
  const token = req.header('cognito-token'); // 从请求头获取 token

  // 如果没有 token，则返回错误
  if (!token) {
    return res.status(401).send('Access Token not found');
  }

  // 验证 token
  cognitoExpressToC.validate(token, async function (err, response) {
    // 如果验证失败，则返回错误
    if (err) return res.status(401).json({ err });

    // 验证成功，继续执行
    req.userSub = response.sub; // 设置请求对象的 userSub 属性
    let user = await User.findOne({ userId: response.sub }); // 从数据库查找用户
    req.userId = null;

    if (user) {
      req.userId = user._id; // 如果找到用户，设置 userId
    }
    next(); // 继续执行下一个中间件或路由处理器
  });
}

// 可选的 Cognito 身份验证中间件
function isToCCognitoAuthenticatedOptional(req, res, next) {
  const token = req.header('cognito-token'); // 从请求头获取 token

  // 如果没有 token，直接继续执行
  if (!token) {
    next();
    return;
  }

  // 验证 token
  cognitoExpressToC.validate(token, function (err, response) {
    // 如果验证失败，则返回错误
    if (err) return res.status(401).json({ err });
    // 验证成功，继续执行
    req.userSub = response.sub;
    next();
  });
}

// 使用 JWT 进行 Cognito 身份验证的中间件
function isToCCognitoAuthenticatedByJWT(req, res, next) {
  const token = req.header('cognito-token'); // 从请求头获取 token

  // 如果没有 token，则返回错误
  if (!token) {
    return res.status(401).json({ msg: 'No token: Authenticationn Denied.' });
  }

  // 验证 token
  try {
    const decoded = jwt.verify(token, config.get('jwtSecret')); // 使用 JWT 密钥验证 token
    req.user = decoded.user; // 设置请求对象的 user 属性
    next(); // 继续执行下一个中间件或路由处理器
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid.' }); // 如果 token 无效，返回错误
  }
}

// 导出中间件函数
module.exports = {
  isToCCognitoAuthenticated,
  isToCCognitoAuthenticatedOptional,
  isToCCognitoAuthenticatedByJWT,
};
