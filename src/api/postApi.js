import { api } from '@/plugins/axiosinterceptor'

// 게시글 저장 / 불러오기 / 모두 불러오기
const savePost = async (postData, token) => {
  try {
    const post = await api.post('/editor/save', postData, {
      headers: {
            'Authorization': `Bearer ${token}`
      }
    })
    console.log(post)
    return post
  } catch (error) {
    console.log(error)
    return error
  }
}
const getPost = async (idx, token) => {
  try {
    const post = await api.get(`/editor/read/${idx}`, {
      headers: {
            'Authorization': `Bearer ${token}`
      }
    })
    console.log(post)
    return post
  } catch (error) {
    console.log(error)
    return error
  }
}
const allPosts = async (token) => {
  try {
    const post = await api.get('/editor/list', {
      headers: {
            'Authorization': `Bearer ${token}`
      }
    })
    console.log(post)
    return post
  } catch (error) {
    console.log(error)
    return error
  }
}

export default { savePost, getPost, allPosts }
