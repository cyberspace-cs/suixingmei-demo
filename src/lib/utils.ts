export { cn } from "cn"

/** public/ 下的静态资源路径；GitHub Pages 构建时补上 basePath（<img> 和 new Image() 不会自动加） */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`
