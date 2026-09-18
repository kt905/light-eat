/**
 * 百度AI开放平台 - 鉴权与菜品识别客户端
 * 文档：https://ai.baidu.com/ai-doc/IMAGERECOGNITION/dk3bcxe3x
 *  https://ai.baidu.com/customer/qianhong 
 */

const axios = require('axios');

let cachedToken = null;
let tokenExpireAt = 0;

/**
 * 获取百度AI access_token（带缓存）
 * token 有效期 30 天，提前 1 天刷新
 */
async function getAccessToken() {
  const API_KEY = process.env.BAIDU_API_KEY;
  const SECRET_KEY = process.env.BAIDU_SECRET_KEY;

  if (!API_KEY || !SECRET_KEY || API_KEY === 'your_api_key_here') {
    const err = new Error('BAIDU_API_KEY / BAIDU_SECRET_KEY 未配置');
    err.code = 'BAIDU_NOT_CONFIGURED';
    throw err;
  }

  const now = Date.now();
  if (cachedToken && tokenExpireAt > now + 86400 * 1000) {
    return cachedToken;
  }

  const url = 'https://aip.baidubce.com/oauth/2.0/token';
  const params = {
    grant_type: 'client_credentials',
    client_id: API_KEY,
    client_secret: SECRET_KEY,
  };

  try {
    const res = await axios.post(url, null, { params, timeout: 10000 });
    if (!res.data.access_token) {
      const err = new Error(res.data.error_description || '获取access_token失败');
      err.code = 'BAIDU_TOKEN_FAILED';
      err.raw = res.data;
      throw err;
    }
    cachedToken = res.data.access_token;
    tokenExpireAt = now + (res.data.expires_in || 2592000) * 1000;
    console.log('[baidu] access_token 获取成功，有效期至', new Date(tokenExpireAt).toISOString());
    return cachedToken;
  } catch (e) {
    if (e.response) {
      const err = new Error(e.response.data.error_description || '百度鉴权请求失败');
      err.code = 'BAIDU_TOKEN_INVALID';
      err.status = e.response.status;
      err.raw = e.response.data;
      throw err;
    }
    throw e;
  }
}

/**
 * 调用百度菜品识别接口
 * @param {Buffer|string} image - 图片Buffer 或 base64 字符串（不含前缀）
 * @param {number} topNum - 返回候选数量，默认5
 * @returns {Promise<Array<{name:string, probability:number, calorie?:string, baikeInfo?:object}>>}
 */
async function recognizeDish(image, topNum = 5) {
  const token = await getAccessToken();

  let imageBase64;
  if (Buffer.isBuffer(image)) {
    imageBase64 = image.toString('base64');
  } else if (typeof image === 'string') {
    imageBase64 = image.replace(/^data:image\/\w+;base64,/, '');
  } else {
    throw new Error('image 参数必须是 Buffer 或 base64 字符串');
  }

  const url = `https://aip.baidubce.com/rest/2.0/image-classify/v2/dish?access_token=${token}`;
  const params = new URLSearchParams();
  params.append('image', imageBase64);
  params.append('top_num', String(topNum));
  params.append('filter_threshold', '0.1');
  params.append('baike_num', '0');

  try {
    const res = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });
    if (res.data.error_code) {
      const err = new Error(res.data.error_msg || '菜品识别失败');
      err.code = 'BAIDU_API_ERROR';
      err.raw = res.data;
      throw err;
    }
    return res.data.result || [];
  } catch (e) {
    if (e.response && e.response.data) {
      const err = new Error(e.response.data.error_msg || '菜品识别请求失败');
      err.code = 'BAIDU_API_ERROR';
      err.status = e.response.status;
      err.raw = e.response.data;
      throw err;
    }
    throw e;
  }
}

/**
 * 重置token缓存（用于配置变更后强制刷新）
 */
function resetTokenCache() {
  cachedToken = null;
  tokenExpireAt = 0;
}

module.exports = { getAccessToken, recognizeDish, resetTokenCache };
