import test from 'node:test';
import assert from 'node:assert/strict';
import {contrast,labelInk,whiteLabelColor} from './color.mjs';
import {initialCategories} from './model.mjs';

test('every initial category label has readable contrast',()=>{
  for(const category of initialCategories){
    assert.ok(contrast(category.color,labelInk(category.color))>=4.5,category.name);
  }
});

test('dark and light boundaries follow contrast rather than color name',()=>{
  assert.equal(labelInk('#161012'),'#ffffff');
  assert.equal(labelInk('#ffffff'),'#000000');
  assert.ok(contrast('#000000',labelInk('#000000'))>=4.5);
});

test('white-label variants keep every category readable',()=>{
  for(const category of initialCategories){
    assert.ok(contrast(whiteLabelColor(category.color),'#ffffff')>=4.5,category.name);
  }
  assert.equal(whiteLabelColor('#161012'),'#161012');
  assert.ok(contrast(whiteLabelColor('#888'),'#fff')>=4.5);
});
