import { createRouter, createWebHistory } from "vue-router";
// import Flow from "@/views/Flow.vue";

const routes = [
  {
    path: "/",
    name: "Flow",
    component: () => import("@/views/Flow.vue"),
  },
  {
    path: "/virtual",
    name: "Virtual",
    component: () => import("@/views/VirtualList.vue"),
  },
  {
    path: "/VirtualUnfixed",
    name: "VirtualUnfixed",
    component: () => import("@/views/VirtualUnfixed.vue"),
  },
  {
    path: "/markDown",
    name: "markDown",
    component: () => import("@/views/MarkDown.vue"),
  },
  {
    path: "/test",
    name: "test",
    component: () => import("@/views/MarkDownTest.vue"),
  },
  {
    path: "/emoji",
    name: "emoji",
    component: () => import("@/views/Emoji.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
