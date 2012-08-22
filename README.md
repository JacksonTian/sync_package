Sync package
===
# 起源
Mikeal Rogers大神曾经提供了一个CouchDB同步工具[`replicate`](http://github.com/mikeal/replicate)。但是它是全量同步的，且是依次同步的。但是在某些情况下，我需要快速同步我所知道的几个模块到我的本地来，这就是本模块`sync_package`诞生的原因。

# 特色

1. 快速同步指定模块
2. 自动同步依赖模块

# 用法
## 安装模块
```
npm install sync_package -g
```
## 配置NPM地址
这里取巧了一下，利用了npm自身的配置方案。

```
npm config set remote_registry http://isaacs.iriscouch.com/registry/
npm config set remote_registry {remote_registry}
npm config set local_registry {local_registry}
// 因为本地仓库的写入权限问题，所以记得写上口令
npm config set local_registry http://username:password@ip/registry/
```
注意：请以`/`结尾。

## 同步模块
在配置了本地和远程NPM仓库地址之后，调用同步十分简单：

```
sync_package sync_package
sync_package express
sync_package express -D // 不同步依赖
```

事实上，这个模块可以同步任意两个CouchDB数据的文档。

# 许可证
在最为宽松的MIT许可下开源

```
Copyright (c) 2012 Jackson Tian
http://weibo.com/shyvo

The MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```