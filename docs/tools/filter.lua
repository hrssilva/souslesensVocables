-- pass this file to pandoc via `--lua-filter=filename.lua`

function Image (img)
  -- get dimensions
  local width, height = nil, nil -- implement
  img.attributes.width = width
  img.attributes.height = height
  return img
end
