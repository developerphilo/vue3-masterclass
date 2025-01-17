import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import { makeFetchItemAction, makeFetchItemsAction } from "@/helpers";
export default {
  namespaced: true,
  state: {
    items: [],
  },
  getters: {},
  actions: {
    async createPost({ commit, rootState }, post) {
      post.userId = rootState.auth.authId;
      post.publishedAt = firebase.firestore.FieldValue.serverTimestamp();
      const batch = firebase.firestore().batch();
      const postRef = firebase.firestore().collection("posts").doc();
      const threadRef = firebase
        .firestore()
        .collection("threads")
        .doc(post.threadId);
      const userRef = firebase
        .firestore()
        .collection("users")
        .doc(rootState.auth.authId);
      batch.set(postRef, post);
      batch.update(threadRef, {
        posts: firebase.firestore.FieldValue.arrayUnion(postRef.id),
        contributors: firebase.firestore.FieldValue.arrayUnion(
          rootState.auth.authId
        ),
      });
      batch.update(userRef, {
        postsCount: firebase.firestore.FieldValue.increment(1),
      });
      await batch.commit();
      const newPost = await postRef.get();
      commit(
        "setItem",
        { resource: "posts", item: { ...newPost.data(), id: newPost.id } },
        { root: true }
      ); // set the post
      commit(
        "threads/appendPostToThread",
        { childId: newPost.id, parentId: post.threadId },
        { root: true }
      ); // append post to thread
      commit(
        "threads/appendContributorToThread",
        { childId: rootState.auth.authId, parentId: post.threadId },
        { root: true }
      );
    },
    async updatePost({ commit, rootState }, { text, id }) {
      const post = {
        text,
        edited: {
          at: firebase.firestore.FieldValue.serverTimestamp(),
          by: rootState.auth.authId,
          moderated: false,
        },
      };
      const postRef = firebase.firestore().collection("posts").doc(id);
      await postRef.update(post);
      const updatedPost = await postRef.get();
      commit(
        "setItem",
        { resource: "posts", item: updatedPost },
        { root: true }
      );
    },
    fetchPost: makeFetchItemAction({ emoji: "💬", resource: "posts" }),
    fetchPosts: makeFetchItemsAction({ emoji: "💬", resource: "posts" }),
  },
  mutations: {},
};
