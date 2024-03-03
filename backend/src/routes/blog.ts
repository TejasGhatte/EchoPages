import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'
import {z} from "zod"
import { createPostInput, updatePostInput } from '@tejasghatte/common'
import Fuse from 'fuse.js'

export const blogRouter = new Hono<{
    Bindings: {
      DATABASE_URL: string,
      JWT_SECRET: string
    },
    Variables: {
      userID: string
    }
  }>()


//middleware
blogRouter.use('/* ', async(c, next)=>{
    const header = c.req.header("authorization") || "";
    const token = header.split(" ")[1];

    const response = await verify(token, c.env.JWT_SECRET);
    if(response.id){
      c.set('userID', response.id)
      console.log(response.id)
      await next()
    }else{
      c.status(403);
      return c.json({
        message:"Unauthorized"
      })
    }
})

// Post a blog with title, content, author
blogRouter.post('/',async (c) => {
    const userId = c.get('userID')
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const body = await c.req.json();
    const {success} = createPostInput.safeParse(body);

    if(!success){
      c.status(400);
      return c.json({
        error: "Invalid Input"
      })
    }
    
    try{
        const post = await prisma.post.create({
            data:{
                title: body.title,
                content: body.content,
                authorId: userId,
            }
        })

        c.status(201);
        return c.json({
            message: "Post created succesfully",
            id: post.id
        })
    } catch(err){
        c.status(403)
        c.json({
            message: "Some error occured",
            error: err
        })
    }
  })


// Update the blog
blogRouter.put('/', async (c) => {
    const userId = c.get('userID')
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const body = await c.req.json();

    const {success} = updatePostInput.safeParse(body);

    if(!success){
      c.status(400);
      return c.json({
        error: "Invalid Input"
      })
    }

    try{
        await prisma.post.update({
            where: {
                id: body.id,
                authorId: userId
            },
            data: {
                title: body.title,
                content: body.content
            }
        })

        c.status(201)
        return c.json({
            message: "Post updated"
        })
    }catch(err){
        c.status(403)
        return c.json({
            message: "Some error occured",
            error: err
        })
    }

  })

// Get all blogs
blogRouter.get('/bulk', async (c)=>{
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    const filter = c.req.query?.('filter') ||" ";
    const posts = await prisma.post.findMany();

    if (filter) {
      const fuse = new Fuse(posts, {
        keys: ['title'],
        includeScore:false,
      });
      //Fuzzy search
      const searchResults = fuse.search(filter);
      return c.json({ posts: searchResults });
    }else{
      return c.json({ posts });
    }
})


//Get a blog by id
blogRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
}).$extends(withAccelerate())
  console.log(id);

  const post = await prisma.post.findUnique({
    where:{
        id: id
    }
  })

  if(!post){
    c.status(403)
    return c.json({
        message: "Post not found"
    })
  }

  return c.json(post)
})
