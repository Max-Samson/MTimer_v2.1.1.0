package di

import (
	"fmt"
	"reflect"
	"sync"
)

// Container 依赖注入容器
type Container struct {
	mu        sync.RWMutex
	services  map[string]interface{}
	factories map[string]func() interface{}
	names     map[string]interface{}
}

// New 创建新的依赖注入容器
func New() *Container {
	return &Container{
		services:  make(map[string]interface{}),
		factories: make(map[string]func() interface{}),
		names:     make(map[string]interface{}),
	}
}

// Provide 注册服务实例
func (c *Container) Provide(service interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	serviceType := reflect.TypeOf(service)
	if serviceType.Kind() != reflect.Ptr && serviceType.Kind() != reflect.Interface {
		panic("service must be a pointer or interface")
	}

	key := getServiceKey(serviceType)
	c.services[key] = service
}

// ProvideNamed 按名称注册服务实例
func (c *Container) ProvideNamed(name string, service interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.names[name] = service
}

// ProvideFactory 注册服务工厂函数
func (c *Container) ProvideFactory(factory interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	factoryType := reflect.TypeOf(factory)
	if factoryType.Kind() != reflect.Func {
		panic("factory must be a function")
	}

	if factoryType.NumOut() != 1 {
		panic("factory function must return exactly one value")
	}

	returnType := factoryType.Out(0)
	key := getServiceKey(returnType)

	factoryValue := reflect.ValueOf(factory)
	c.factories[key] = func() interface{} {
		results := factoryValue.Call(nil)
		return results[0].Interface()
	}
}

// Resolve 解析服务依赖
func (c *Container) Resolve(serviceType interface{}) interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()

	// 如果是字符串，按名称解析
	if name, ok := serviceType.(string); ok {
		if service, exists := c.names[name]; exists {
			return service
		}
		panic(fmt.Sprintf("no provider found for name: %s", name))
	}

	targetType := reflect.TypeOf(serviceType)
	if targetType.Kind() != reflect.Ptr && targetType.Kind() != reflect.Interface {
		panic("service type must be a pointer or interface")
	}

	key := getServiceKey(targetType)

	// 先查找已注册的服务实例
	if service, exists := c.services[key]; exists {
		return service
	}

	// 查找工厂函数
	if factory, exists := c.factories[key]; exists {
		service := factory()
		// 缓存单例实例
		c.services[key] = service
		return service
	}

	panic(fmt.Sprintf("no provider found for type: %s", key))
}

// ResolveAll 解析所有指定类型的服务
func (c *Container) ResolveAll(serviceType interface{}) []interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()

	targetType := reflect.TypeOf(serviceType)
	key := getServiceKey(targetType)

	var services []interface{}

	// 查找已注册的服务实例
	if service, exists := c.services[key]; exists {
		services = append(services, service)
	}

	// 查找工厂函数创建的服务
	if factory, exists := c.factories[key]; exists {
		service := factory()
		services = append(services, service)
	}

	return services
}

// HasService 检查是否已注册指定类型的服务
func (c *Container) HasService(serviceType interface{}) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	targetType := reflect.TypeOf(serviceType)
	key := getServiceKey(targetType)

	_, hasInstance := c.services[key]
	_, hasFactory := c.factories[key]

	return hasInstance || hasFactory
}

// Remove 移除已注册的服务
func (c *Container) Remove(serviceType interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	targetType := reflect.TypeOf(serviceType)
	key := getServiceKey(targetType)

	delete(c.services, key)
	delete(c.factories, key)
}

// Clear 清空所有注册的服务
func (c *Container) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.services = make(map[string]interface{})
	c.factories = make(map[string]func() interface{})
}

// getServiceKey 生成服务键
func getServiceKey(serviceType reflect.Type) string {
	if serviceType.Kind() == reflect.Ptr {
		serviceType = serviceType.Elem()
	}
	return serviceType.String()
}

// Invoke 调用函数并注入依赖
func (c *Container) Invoke(fn interface{}) error {
	fnType := reflect.TypeOf(fn)
	if fnType.Kind() != reflect.Func {
		return fmt.Errorf("fn must be a function")
	}

	fnValue := reflect.ValueOf(fn)
	numIn := fnType.NumIn()

	// 准备参数
	args := make([]reflect.Value, numIn)
	for i := 0; i < numIn; i++ {
		paramType := fnType.In(i)

		// 处理指针类型
		var resolveType reflect.Type
		if paramType.Kind() == reflect.Ptr {
			resolveType = paramType
		} else {
			// 为非指针类型创建指针类型进行解析
			resolveType = reflect.PtrTo(paramType)
		}

		// 解析依赖
		service := c.Resolve(reflect.New(resolveType).Elem().Interface())
		serviceValue := reflect.ValueOf(service)

		// 如果需要指针但得到的是值，则取地址
		if paramType.Kind() == reflect.Ptr && serviceValue.Kind() != reflect.Ptr {
			ptr := reflect.New(serviceValue.Type())
			ptr.Elem().Set(serviceValue)
			args[i] = ptr
		} else {
			args[i] = serviceValue
		}
	}

	// 调用函数
	fnValue.Call(args)
	return nil
}

// MustResolve 解析服务，失败时panic
func (c *Container) MustResolve(serviceType interface{}) interface{} {
	service := c.Resolve(serviceType)
	if service == nil {
		panic(fmt.Sprintf("failed to resolve service: %T", serviceType))
	}
	return service
}
