function fidelity_matlab_probe(imagePath, darkPath, outputFile)
% Run in MATLAB R2024b + Image Processing Toolbox. Not executed by Python.
% outputFile should point outside the Git repository.
% No raw image export. This probe records classes and numerical checkpoints.
readpsf = imread(imagePath);
imgdark = imread(darkPath);
img_stack(:,:,1) = readpsf(:,:,1); % intentionally no preallocation
img(:,:,1) = img_stack(:,:,1) - imgdark;
img_rot(:,:,1) = imrotate(img(:,:,1),0,'bilinear','crop');
OTF = fftshift(fft2(img_rot(:,:,1)));
MTF(:,:,1) = abs(OTF); % preserve author's initially undefined indexed allocation
rawMagnitude = MTF(:,:,1);
MTF(:,:,1) = medfilt2(MTF(:,:,1));
filteredMagnitude = MTF(:,:,1);
max_val = max(max(MTF(:,:,1)));
MTF(:,:,1) = MTF(:,:,1) ./ max_val;
normalizedMTF = MTF(:,:,1);
classes = struct('imread',class(readpsf),'dark',class(imgdark), ...
    'img_stack',class(img_stack),'subtracted',class(img), ...
    'rotated',class(img_rot),'OTF',class(OTF), ...
    'magnitude',class(rawMagnitude),'filtered',class(filteredMagnitude), ...
    'normalized',class(normalizedMTF));
rotationIdentity = isequal(img,img_rot);
imageDimensions = size(img_rot);
idx = sub2ind(size(normalizedMTF),[555,568,541,541,541],[961,961,985,1009,961]);
sampleLabels = {'vertical50','vertical100','horizontal50','horizontal100','DC'};
samples = [rawMagnitude(idx);filteredMagnitude(idx);normalizedMTF(idx)];
statistics = struct('subtractedSum',sum(double(img(:))), ...
    'subtractedMin',double(min(img(:))),'subtractedMax',double(max(img(:))), ...
    'filteredMaximum',max_val,'rotationIdentity',rotationIdentity);
dimx=size(img_stack,1); dimy=size(img_stack,2);
x_um=.00504/20*linspace(1,dimx,dimx); delx=x_um(2)-x_um(1);
y_um=.00504/20*linspace(1,dimy,dimy); dely=y_um(2)-y_um(1);
xi=linspace(-1/(2*delx),1/(2*delx),dimx+1); xi=xi(1:end-1);
eta=linspace(-1/(2*dely),1/(2*dely),dimy+1); eta=eta(1:end-1);
fixtureA=uint16([0 65535 25; 1 50 0]);
fixtureDark=uint16([1 0 50; 65535 25 0]);
fixtureSub=fixtureA-fixtureDark;
fixtureMedianInput=reshape(0:19,5,4).';
fixtureMedianOutput=medfilt2(fixtureMedianInput);
matlabVersion=version;
save(outputFile,'classes','rotationIdentity','imageDimensions','samples', ...
    'sampleLabels','statistics','xi','eta','fixtureSub','fixtureMedianInput', ...
    'fixtureMedianOutput','matlabVersion');
end
