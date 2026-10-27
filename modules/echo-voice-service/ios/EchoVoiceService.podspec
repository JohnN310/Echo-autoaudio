Pod::Spec.new do |s|
  s.name = 'EchoVoiceService'
  s.version = '1.0.0'
  s.summary = 'Native support for Echo hands-free sessions'
  s.description = 'Validates on-device English recognition support.'
  s.license = { :type => 'MIT' }
  s.author = 'Echo'
  s.homepage = 'https://github.com/JohnN310/Echo-autoaudio'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :git => 'https://github.com/JohnN310/Echo-autoaudio.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.frameworks = 'Speech'
end
