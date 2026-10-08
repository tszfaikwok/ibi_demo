// Vercel Serverless Function: returns user info.
export default function handler(req, res) {
  res.status(200).json({
    success: true,
    data: {
      id: '68d6380a-31cd-492d-801f-ff1845f87b33',
      name: 'tsz fai',
      email: 'tszfai.kwo****@fujifilm.com',
      avatar: 'https://p1.mingdaoyun.cn/UserAvatar/default2.png?watermark/2/text/dA==/font/5oCd5rqQ6buR5L2T/fontsize/1000/fill/d2hpdGU=/dissolve/100/gravity/Center/dx/0/dy/0/fontstyle/Ym9sZA==%7CimageView2/1/w/100/h/100/q/90',
    },
  });
}
