const globalConfig = {
  name: "ragflux", // 应用名称

  // 开发环境配置
  development: {
    urls: {
      web: "http://localhost:3000",
      api: "http://localhost:3001",
    },
    ports: {
      web: 3000,
      api: 3001,
      relay: 3002,
      worker: 3003,
    },
  },

  // 生产环境配置
  production: {
    hosts: {
      web: "https://ragflux.8023time.com",
      api: "https://api.ragflux.8023time.com",
    },
    ports: {
      web: 3000,
      api: 3001,
      relay: 3002,
      worker: 3003,
    },
  },
};

export { globalConfig };
export type GlobalConfig = typeof globalConfig;
