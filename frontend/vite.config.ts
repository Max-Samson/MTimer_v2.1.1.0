import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    // 解决Vue特性标志警告
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
  }
})