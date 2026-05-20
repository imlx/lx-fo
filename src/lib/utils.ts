import { clsx, type ClassValue } from "clsx";

/**
 * 类名合并工具函数
 * 用于合并多个类名，支持条件类名
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}