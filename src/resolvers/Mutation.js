import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import getUserId from '../utils/getUserId';

const Mutation = {
  async createUser(parent, args, { prisma }, info) {
    // const emailTaken = await prisma.exists.User({ email: args.data.email });
    // if(emailTaken) {
    //   throw new Error('Email taken.');
    // }
    if(args.data.password.length < 8) {
      throw new Error("Password must be 8 characters or longer.");
    }

    const hashedPassword = await bcrypt.hash(args.data.password, 10);
    const user = await prisma.mutation.createUser({
      data: {
        ...args.data,
        password: hashedPassword
      }
    }); // do not add info here as a second param for output. This will return all scalar fields. The info argument are the fields specified by the client that they want returned.  We specified that we wanted:
    //
    // user {
    //   id
    //   name
    //   email
    // }
    // But you can't pass that into prisma.mutation.createUser because there is no user field on the User type.

    return {
      user,
      token: jwt.sign({ userId: user.id }, 'thisismysecretkey') //Create a new JWT token.
    }
  },
  async login(parent, args, { prisma }, info) {
    const user  = await prisma.query.user({
      where: {
        email: args.data.email
      }
    });
    if(!user) {
      throw new Error('Unable to login');
    }
    const isMatch = await bcrypt.compare(args.data.password, user.password);
    if(!isMatch) {
      throw new Error('Unable to login');
    }
    return {
      user,
      token: jwt.sign({ userId: user.id }, 'thisismysecretkey') //Create a new JWT token.
    }
  },
  async deleteUser(parent, args, { prisma, request }, info) {
    const userId = getUserId(request);

    return prisma.mutation.deleteUser({
        where: {
          id: userId
        }
      }, info);
  },
  updateUser(parent, args, { prisma, request }, info) {
    const userId = getUserId(request);

    return prisma.mutation.updateUser({
      where: {
        id: userId
      },
      data: args.data
    }, info);
  },
  createPost(parent, args, { prisma, request }, info) {
    const userId = getUserId(request);

    return prisma.mutation.createPost({
      data: {
        title: args.data.title,
        body: args.data.body,
        published: args.data.published,
        author: {
          connect: {
            id: userId  //use authenticated user's id.
          }
        }
      }
    }, info);
  },
  async deletePost(parent, args, { prisma, request }, info) {
    const userId = getUserId(request);
    const postExists = await prisma.exists.Post({
      id: args.id,
      author: {
        id: userId
      }
    });
    if(!postExists) throw new Error('Unable to delete post');

    return prisma.mutation.deletePost({
      where: {
        id: args.id
      }
    }, info);
  },
  async updatePost(parent, args, { prisma, request }, info) {
    const userId = getUserId(request);
    const postExists = await prisma.exists.Post({
      id: args.id,
      author: {
        id: userId
      }
    });
    const isPublished = await prisma.exists.Post({
      id: args.id,
      author: {
        id: userId
      },
      published: true
    });

    if(!postExists) throw new Error('Unable to update post');

    if(isPublished && (args.data.published === false)) {
     await  prisma.mutation.deleteManyComments({
        where: {
          post: {
            id: args.id
          }
        }
      })
    }






    return prisma.mutation.updatePost({
      data: args.data,
      where: {
        id: args.id
      }
    }, info);
  },
  async createComment(parent, args, { prisma, request }, info) {
    const userId = getUserId(request);
    const  postExists = await prisma.exists.Post({
      id: args.data.post,
      published: true
    });

    if(!postExists) throw new Error('Unable to find post');

    return prisma.mutation.createComment({
      data: {
        text: args.data.text,
        post: {
          connect: {
            id: args.data.post
          }
        },
        author: {
          connect: {
            id: userId
          }
        }
      }
    }, info);
  },
  async deleteComment(parent, args, { prisma, request }, info) {
    const userId = getUserId(request);
    const commentExists = await prisma.exists.Comment({
      id: args.id,
      author: {
        id: userId
      }
    });
    if(!commentExists) throw new Error('Unable to delete comment');
    return prisma.mutation.deleteComment({
      where: {
        id: args.id
      }
    }, info);
  },
  async updateComment(parent, args, { prisma, request }, info) {
    const userId = getUserId(request);
    const commentExists = await prisma.exists.Comment({
      id: args.id,
      author: {
        id: userId
      }
    });
    if(!commentExists) throw new Error('Unable to update comment');
    return prisma.mutation.updateComment({
      where: {
        id: args.id
      },
      data: args.data
    });
  }
};

export { Mutation as default };

