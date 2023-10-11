const CognitoExpress=require('cognito-express');
const config=require('../config/production.json');


const cognitoExpressToC = new CognitoExpress({
    region: config.CognitoRegion,
    cognitoUserPoolId: config.CognitoToCUserPoolId,
    tokenUse: config.CognitoTokenUse, //Possible Values: access | id
    tokenExpiration: config.CognitoTokenExpiration, //Up to default expiration of 1 hour (3600000 ms)
  });

function isToCCognitoAuthenticated(req,res,next){
    const token=req.header('cognito-token');
    //check if token exist
    if(!token){
        return res.status(401).send('Access Token Not Found!');
    }
    cognitoExpressToC.validate(token,async function(err,response){
        //if api is not athenticated,return 401 with error message
        if(err) return res.status(401),json({err});
        //Else,API has athenticated,Proceed
        req.userSub=response.sub;//Sub 标识符通常用于在身份验证和授权过程中唯一标识用户。它是标识用户的主要方式，而不是依赖于用户名或电子邮件等用户提供的信息
        let user=await UserActivation.findOne({userId:response.sub});
        req.userId=null;

        if(user){
            req.userId=user._id;
        }
        next();//next()类似于continue,因为中间件在中间，所以这个函数用来承接下面继续步骤
    })
}

module.exports={ isToCCognitoAuthenticated};