import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 5000,
})

const postApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    console.log('요청이 전송되었습니다.')
    return config
  },
  (error) => {
    console.log('요청 전송 중 오류가 발생했습니다.')
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  (config) => {
    console.log('응답을 수신했습니다.')
    return config
  },
  (error) => {
    console.log('응답 처리 중 오류가 발생했습니다.')
    return Promise.reject(error)
  },
)

// // 2. DB 문서 조회(예시)
// const loadDocument = async (docId) => {
//   try {
//     const res = await axios.get(`/api/documents/${docId}`)
//     if (res.data && res.data.content) {
//       // 서버 응답이 JSON 형태면 Quill에서 읽을 수 있도록 파싱
//       const delta = JSON.parse(res.data.content)
//       quill.setContents(delta)
//     }
//   } catch (err) {
//     console.error('문서 로딩 중 오류:', err)
//   }
// }

export default { api, postApi }
