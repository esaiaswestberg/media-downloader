package youtube

import (
	"sync"
	"time"

	"github.com/wader/goutubedl"
)

type cacheEntry struct {
	result    *goutubedl.Result
	timestamp time.Time
}

type resultCache struct {
	mu       sync.RWMutex
	cache    map[string]cacheEntry
	maxAge   time.Duration
	hasClean bool
}

var cache = &resultCache{
	cache:    make(map[string]cacheEntry),
	maxAge:   30 * time.Minute,
	hasClean: false,
}

func (c *resultCache) Get(url string) (*goutubedl.Result, bool) {
	c.mu.RLock()
	entry, exists := c.cache[url]

	if !c.hasClean {
		c.startCleaning()
		c.hasClean = true
	}
	c.mu.RUnlock()

	// Check if entry exists
	if !exists {
		return nil, false
	}

	// Check if entry is expired
	if time.Since(entry.timestamp) > c.maxAge {
		c.mu.Lock()
		delete(c.cache, url)
		c.mu.Unlock()
		return nil, false
	}

	return entry.result, true
}

func (c *resultCache) Set(url string, result *goutubedl.Result) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.cache[url] = cacheEntry{
		result:    result,
		timestamp: time.Now(),
	}
}

func (c *resultCache) startCleaning() {
	go func() {
		for {
			time.Sleep(c.maxAge * 4)

			c.mu.Lock()
			for url, entry := range c.cache {
				if time.Since(entry.timestamp) > c.maxAge {
					delete(c.cache, url)
				}
			}
			hasClean := len(c.cache) > 0
			c.hasClean = hasClean
			c.mu.Unlock()

			if !hasClean {
				break
			}
		}
	}()
}
