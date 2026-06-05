import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await req.json();
    
    if (!postId) {
      return Response.json({ error: 'postId required' }, { status: 400 });
    }

    // Get the post
    const posts = await base44.asServiceRole.entities.Post.filter({ id: postId });
    if (!posts.length) {
      return Response.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = posts[0];
    
    // If createdAtUtc is not set, set it now
    if (!post.createdAtUtc) {
      // Use Base44's created_date if available, otherwise use current time
      const timestamp = post.created_date || new Date().toISOString();
      await base44.asServiceRole.entities.Post.update(postId, {
        createdAtUtc: timestamp
      });
      console.log(`Set createdAtUtc for post ${postId} to ${timestamp}`);
    }

    return Response.json({ success: true, createdAtUtc: post.createdAtUtc });
  } catch (error) {
    console.error('Error setting createdAtUtc:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});