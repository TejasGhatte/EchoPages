import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'
import {z} from "zod";
import { signupInput, signinInput } from '@tejasghatte/common'

export const userRouter = new Hono<{
    Bindings: {
      DATABASE_URL: string,
      JWT_SECRET: string
    }
  }>()



userRouter.post('/signup', async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())
  
    const body = await c.req.json();
    const {success} = signupInput.safeParse(body);
    if(!success){
      c.status(400);
      return c.json({
        error: 'Invalid input'
      })
    }
    try{
      const user = await prisma.user.create({
        data: {
          email: body.email,
          password: body.password
        }
      })
  
      const token = await sign({id: user.id}, c.env.JWT_SECRET);
      c.status(200);
      return c.json({
        message: "User created successfully",
        jwt: token
      })
    } catch(err) {
        c.status(403);
        return c.json({
          message: "Error while logging in.."
        })
    }
  })
  
userRouter.post('/signin', async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())
  
    const body = await c.req.json();
    const {success}  = signinInput.safeParse(body);
    
    if(!success){
      c.status(400);
      return c.json({
        error: 'Invalid input'
      })
    }

    try{
      const user = await prisma.user.findUnique({
        where: {
          email: body.email,
          password: body.pasword
        }
      })
  
      if (!user){
        c.status(403)
        return c.json({
          message: "User not found"
        })
      }
  
      const token = await sign({id: user.id}, c.env.JWT_SECRET)
  
      c.status(200);
      return c.json({
        message: "You are logged in",
        jwt: token
      })
    } catch(err){
        c.status(403)
        return c.json({
          message: "Some error occured"
        })
    }
  
  })